# Changelog

All notable changes to Kodibox are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Organization means a Kodibox customer account. Tenant means the person renting a unit.

## [Unreleased]

### Added

- Payment instructions per Organization: paybill, account reference and bank details, with copy buttons for Tenants (web Settings, onboarding step 4 and the tenant "How to pay" screen).
- Statement import dialog on the web, with a preview of new, duplicate, conflicting and possible-duplicate lines.
- Unmatched queue and Tenant claims tab on the web Payments screen.
- Tenant "I've paid" flow on web and mobile: paste the M-Pesa message, review the parsed code, amount, date and account, then send for verification.
- Manager approvals on mobile for Tenant claims, unmatched statement lines and cash entries.
- Reconciliation engine in `packages/core/src/reconciliation`: parsers, normalisation, dedupe, matching and allocation as pure, tested logic.
- Mobile app prototype (`apps/mobile`, Expo) for Tenants, Caretakers and Managers, on demo data.
- Light, dark and system themes on the web (Settings → Appearance) and on mobile, driven by shared colour tokens.
- Shared demo data package (`packages/demo`) and colour token package (`packages/ui`).
- Design frames for Welcome, I've paid, Manager More, Import statement and Payment instructions.

### Changed

- Payments are reconciled, not collected (ADR 0007): Daraja, STK Push, C2B and bank callbacks are removed from the plan.
- Onboarding has seven steps: Organization, Property, Units, Payment instructions, Import tenants, First statement and First invoices. The Connect M-Pesa step is removed.
- Tenant "Pay with M-Pesa" is now "How to pay", showing the Organization's paybill and the unit's account reference.
- Manager mobile tabs are Home, Approvals, Tenants, Alerts and More. Approvals is split into Claims, Unmatched, Cash and Readings.
- Agency-client Landlords use the `landlord_viewer` role. An independent Landlord is the Owner of their own Organization.
- Architecture, data model, security, mobile and design docs updated for payment-agnostic reconciliation and the prototypes.

### Fixed

- Reconciliation engine: findings from four security review rounds fixed, with tests added for each round.
- Design frames: removed "Verified with Safaricom", Daraja and STK wording, which described payment-rail checks that Kodibox does not perform.

### Security

- Recorded the acceptance criteria for the real claim, approval and receipt actions (ADR 0007 addendum, SECURITY section 7.1).
- Kodibox stores no payment-rail credentials and has no payment webhook endpoint (ADR 0007, SECURITY section 7).
