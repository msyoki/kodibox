# Daraja reference (verify against current Safaricom docs)

## STK result codes (callback `ResultCode`)
| Code | Meaning | Action |
|---|---|---|
| 0 | Success | Credit via worker |
| 1 | Insufficient funds | Failed, tell tenant |
| 1001 | Unable to lock subscriber (another transaction in flight) | Retry later |
| 1019 | Transaction expired | Failed |
| 1025 | Error sending push (often bad request/limits) | Retry once, then alert |
| 1032 | Cancelled by user | Failed, no retry |
| 1037 | Timeout, user unreachable | Failed, allow retry |
| 2001 | Wrong PIN | Failed |
| 9999 | Push request error | Retry once |

## Request-level errors
| errorCode / ResponseCode | Meaning |
|---|---|
| 404.001.03 / 400.008.01 | Invalid/expired access token or wrong grant type; refresh token |
| 400.002.02 | Bad request (invalid field, e.g. phone format, amount) |
| 500.001.1001 | Duplicate or "being processed" / wrong credentials depending on API |
| ResponseCode "0" on STK request | Accepted for processing only, NOT paid |

## C2B validation rejection codes
C2B00011 invalid MSISDN, C2B00012 invalid account number, C2B00013 invalid amount, C2B00014 invalid KYC details, C2B00015 invalid shortcode, C2B00016 other error.

## Account-number to unit matching heuristics
Order (stop at first unique hit within the organization/shortcode):
1. Exact match on `units.payment_code` (generated, short, e.g. `KB-A12`). Prefer issuing these codes to tenants; make them unique per org.
2. Normalised match: uppercase, remove spaces, dashes, dots, leading `#`; compare to payment_code and unit number.
3. `<propertyCode><unitNumber>` composite (e.g. `SUN12`, `SUN-12`).
4. Sender phone to an active lease's tenant phone (only if exactly one active lease); note v2 C2B returns hashed MSISDN, so keep a salted-hash index of tenant phones.
5. Amount hint: exact equals rent for exactly one candidate (use only to rank, never alone).
Outcomes: `matched` (auto-allocate), `ambiguous` or `unmatched` (review queue; post to a suspense account, `Cash/M-Pesa clearing` credited to `Unallocated Receipts`), never auto-assign on fuzzy/amount-only evidence. Store match method and confidence in the allocation audit event. Typos: allow a Levenshtein distance of 1 only when it yields a single candidate AND the phone matches.

## Sandbox vs production
- Sandbox shortcode 174379 and the public sandbox passkey (published in Daraja docs; do not commit even those into prod config). Sandbox C2B simulate endpoint exists; production has none, so tests there use real small payments.
- Sandbox is flaky and callbacks need a public tunnel (ngrok/cloudflared) in dev; prefer replaying fixtures in tests.
- Production needs Go-Live, per-shortcode credentials, IP allowlist of Safaricom callback sources (take from current Safaricom guidance; keep in config, not code), and C2B URL registration per shortcode (re-registration of URLs may be blocked once set; plan for it).

## Test fixtures (fake data only)
```ts
export const stkSuccess = {
  Body: { stkCallback: {
    MerchantRequestID: '29115-34620561-1', CheckoutRequestID: 'ws_CO_191220191020363925',
    ResultCode: 0, ResultDesc: 'The service request is processed successfully.',
    CallbackMetadata: { Item: [
      { Name: 'Amount', Value: 1500 }, { Name: 'MpesaReceiptNumber', Value: 'TST1234ABC' },
      { Name: 'TransactionDate', Value: 20240115101530 }, { Name: 'PhoneNumber', Value: 254700000000 },
    ] } } },
};
export const stkCancelled = { Body: { stkCallback: { MerchantRequestID: 'x', CheckoutRequestID: 'y',
  ResultCode: 1032, ResultDesc: 'Request cancelled by user' } } };
export const c2bConfirmation = {
  TransactionType: 'Pay Bill', TransID: 'TST1234ABD', TransTime: '20240115101530', TransAmount: '15000.00',
  BusinessShortCode: '600000', BillRefNumber: 'KB-A12', InvoiceNumber: '', OrgAccountBalance: '0.00',
  ThirdPartyTransID: '', MSISDN: 'fakehash', FirstName: 'TEST', MiddleName: '', LastName: 'USER',
};
```
Required tests: replayed TransID is a no-op; wrong secret path returns 404/401 and writes nothing; amount mismatch on Transaction Status parks the payment; callback arriving before the attempt row commits is retried by the worker; TransTime parsed as Africa/Nairobi, stored UTC.

## Amount handling
Daraja amounts are KES (decimal strings in C2B, numbers in STK). Convert with `Money.fromKesString` (see ledger-money); reject anything that is not a whole-cent value; STK requests only accept whole shillings.
