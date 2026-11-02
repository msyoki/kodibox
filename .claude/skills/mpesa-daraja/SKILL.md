---
name: mpesa-daraja
description: M-Pesa Daraja integration patterns for Kodibox (OAuth token caching, STK Push, C2B register/validation/confirmation, Transaction Status verification, idempotency, account-number-to-unit matching, fixtures). Use whenever editing packages/integrations/mpesa, payment webhooks, reconciliation, or payment tests. B2C is never used.
---
# M-Pesa Daraja

Rules: money goes straight to the landlord's own paybill/till (never hold funds, no B2C). Webhooks are verified, idempotent, stored encrypted, acknowledged fast, processed in the worker. Never log raw payloads, MSISDNs, or tokens. Credentials come from `packages/config/env.ts` per organization (stored encrypted), never literals. Verify endpoint paths and codes against current Safaricom docs before shipping; details drift.

Deeper material (error codes, matching heuristics, fixtures): see [reference.md](reference.md).

## Config
Sandbox base `https://sandbox.safaricom.co.ke`, production `https://api.safaricom.co.ke`. Select via env `MPESA_ENV=sandbox|production`; never default to production.

## OAuth token with caching
```ts
type Token = { value: string; expiresAt: number };
const cache = new Map<string, Token>(); // key: orgId+env; use Redis in multi-instance deployments

export async function getToken(cfg: DarajaCfg, now = Date.now()): Promise<string> {
  const hit = cache.get(cfg.key);
  if (hit && hit.expiresAt - 60_000 > now) return hit.value; // refresh 60s early
  const basic = Buffer.from(`${cfg.consumerKey}:${cfg.consumerSecret}`).toString('base64');
  const res = await fetch(`${cfg.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${basic}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new DarajaError('oauth_failed', res.status);
  const j = z.object({ access_token: z.string(), expires_in: z.coerce.number() }).parse(await res.json());
  cache.set(cfg.key, { value: j.access_token, expiresAt: now + j.expires_in * 1000 });
  return j.access_token;
}
```
On a 401 from any call, drop the cache entry and retry once. Coalesce concurrent refreshes with a single in-flight promise.

## STK Push
Timestamp is `yyyyMMddHHmmss` in Africa/Nairobi; password = base64(shortcode + passkey + timestamp).
```ts
export const nairobiTimestamp = (d = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit',
    day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
    .formatToParts(d).filter(p => p.type !== 'literal').map(p => p.value).join('');

export const stkPassword = (shortcode: string, passkey: string, ts: string) =>
  Buffer.from(shortcode + passkey + ts).toString('base64');

export async function stkPush(cfg: DarajaCfg, p: { amountKes: number; msisdn: string; accountRef: string; desc: string }) {
  const ts = nairobiTimestamp();
  const body = {
    BusinessShortCode: cfg.shortcode, Password: stkPassword(cfg.shortcode, cfg.passkey, ts), Timestamp: ts,
    TransactionType: cfg.kind === 'till' ? 'CustomerBuyGoodsOnline' : 'CustomerPayBillOnline',
    Amount: p.amountKes,            // Daraja takes whole KES; convert from minor units, reject fractional
    PartyA: p.msisdn.replace('+', ''), PartyB: cfg.kind === 'till' ? cfg.tillNumber : cfg.shortcode,
    PhoneNumber: p.msisdn.replace('+', ''), CallBackURL: cfg.stkCallbackUrl,
    AccountReference: p.accountRef.slice(0, 12), TransactionDesc: p.desc.slice(0, 13),
  };
  // POST {base}/mpesa/stkpush/v1/processrequest -> { MerchantRequestID, CheckoutRequestID, ResponseCode }
}
```
Persist a `payment_attempts` row (status `pending`, CheckoutRequestID unique per org) BEFORE returning. Poll `stkpushquery` after ~30-60s if no callback arrives.

## STK callback handling
Route `POST /api/webhooks/mpesa/stk/[secret]`: constant-time compare the path secret, check source IP allowlist, Zod-parse, insert raw payload (encrypted) with unique `CheckoutRequestID`, enqueue job, return `{ ResultCode: 0, ResultDesc: "Accepted" }` immediately. Worker: `ResultCode === 0` reads `CallbackMetadata.Item` (Amount, MpesaReceiptNumber, TransactionDate, PhoneNumber); any other code marks the attempt failed with a mapped reason.

## C2B (paybill/till)
Register once per shortcode: `POST /mpesa/c2b/v2/register` with `ShortCode`, `ResponseType: "Completed"`, `ConfirmationURL`, `ValidationURL` (HTTPS, public, no "mpesa"/"safaricom" in URL). Validation is optional per shortcode (must be enabled by Safaricom): respond `{ResultCode:"0",ResultDesc:"Accepted"}` or `{ResultCode:"C2B00012",ResultDesc:"Rejected"}` quickly (under ~8s) after checking the account number resolves to an active unit. Confirmation carries `TransID, TransAmount, BillRefNumber, MSISDN, TransTime`; it is the source of truth for crediting.

```ts
export const C2BConfirmation = z.object({
  TransactionType: z.string(), TransID: z.string().min(8).max(20), TransTime: z.string().regex(/^\d{14}$/),
  TransAmount: z.coerce.number().positive(), BusinessShortCode: z.string(), BillRefNumber: z.string().default(''),
  MSISDN: z.string(), FirstName: z.string().optional(),
}).passthrough();
```

## Idempotency
Unique indexes `(organization_id, mpesa_trans_id)` and `(organization_id, checkout_request_id)`. Insert-or-ignore (`ON CONFLICT DO NOTHING`); if nothing inserted, return 200 and do nothing. The ledger posting uses the TransID as its idempotency key too.

## Verify before crediting (suspicious or large payments)
Call Transaction Status (`/mpesa/transactionstatus/v1/query`; needs initiator + SecurityCredential, result delivered asynchronously to ResultURL) when a confirmation arrives from an unexpected IP, amount exceeds a threshold, or status is stuck. Amount and receipt must match, else park in the `unmatched` queue and alert.

## Matching to a unit
Normalise BillRefNumber (upper, strip spaces/dashes), try exact unit code, then property-prefix + unit, then phone-to-tenant, then fuzzy; ambiguity goes to a manual review queue, never guess. See reference.md.
