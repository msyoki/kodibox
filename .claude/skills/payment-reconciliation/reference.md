# Payment reconciliation reference (verify formats against real exports)

## M-Pesa business portal statement (CSV/XLSX export)
Usually a few metadata lines (organisation, shortcode, period) come before the header row. Columns:

| Column | Use |
|---|---|
| Receipt No. | `externalRef` (e.g. `QFT4AB12CD`), the dedupe key |
| Completion Time | `paidAt` (Africa/Nairobi local → UTC) |
| Initiation Time | ignore |
| Details | free text, e.g. "Pay Bill from 2547…  - JOHN DOE Acc. B-12" |
| Transaction Status | only `Completed` |
| Paid In | amount received (e.g. `12,000.00` → `1200000n`), must be > 0 |
| Withdrawn | ignore rows where this is set (charges, transfers out) |
| Balance / Balance Confirmed | ignore |
| Reason Type | e.g. "Pay Bill Online", "Pay Bill" |
| Other Party Info | "254712345678 - JOHN DOE" → hash the phone (never store raw), keep the name for display |
| Linked Transaction ID | reversals point back here, so treat as a reversal of that ref |
| A/C No. | `accountRef` → `normaliseAccountRef` ("b12", "B 12", "b-12" → "B-12") |

Handle a BOM, CRLF line endings, quoted fields with commas, thousands separators, and empty trailing rows.

## Pasted M-Pesa confirmation SMS (tenant claims)
Typical shapes (case and spacing vary):
- Paybill: `QFT4AB12CD Confirmed. Ksh12,000.00 sent to RIVERSIDE COURT for account B-12 on 3/11/26 at 9:14 AM. New M-PESA balance is Ksh…`
- Till: `QFT4AB12CD Confirmed. Ksh12,000.00 paid to MWANGI PROPERTIES. on 3/11/26 at 9:14 AM.…` (no account ref, so it relies on phone/amount or manual review)
- Variants: `Ksh 12,000`, lowercase `confirmed`, missing seconds, dates as d/m/yy.
Extract code, amount, payee, account, date. A claim is only evidence and stays `Pending verification`.

## Bank statements
No single format. Use a saved column mapping per org + account: date (with format), amount or credit/debit, reference, description, optional accountRef column. Treat credits only. Bank dates without a time are stored as 12:00 Africa/Nairobi so the calendar day stays stable.

## Matching outcomes
- `matched` (confidence ≥ 0.9, unambiguous) → allocate oldest-first, overpayment to tenant credit.
- `below_threshold`, `ambiguous`, `no_signal`, `no_open_invoices` → unmatched queue. Never auto-assign on amount alone. Store the method, confidence and reasons in the audit event.
- Reversals (Linked Transaction ID) → post ledger reversing entries, never delete.

## Security notes
- File limits: type allowlist (csv/xlsx), size cap, row cap. Parse without evaluating formulas. Escape `= + - @` on any CSV/Excel export (CSV injection).
- Imports are permission-gated (`can(user, 'payments.import', org)`) and audited, with the file stored encrypted and the retention per SECURITY.md.
- Phone hashing is a keyed HMAC supplied by the server (rotate-able key id stored with the hash).
