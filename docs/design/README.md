# Kodibox UI frames

Live canvas (view, click through in Play mode, comment): https://claude.ai/artifact/Ke5VipbbUBXbdSKF9JGhfj

`frames/` holds the source of all 42 screens (`*.dc.html`) plus the canvas layout (`canvas.json`). Five frames were added on 2026-11-15 and are not yet in `canvas.json`; re-sync the canvas before using it to review them. The frames are design mockups, not production code. They use the canvas runtime (`support.js`), so they don't render on their own when opened directly in a browser. Use the live canvas to view them, and treat these files as the reference for layout, copy, sample data and design tokens when building the real UI in `apps/web` and `apps/mobile`.

`SCREEN_SPEC.md` holds the design tokens (colours, fonts, spacing), the payment copy rules and the product rules the frames follow. Its last section lists what changed after the first set of frames.

## Screen inventory
**Web app:**
- Login
- Onboarding (7 steps; step 4 is Payment instructions)
- Main (dashboard)
- Payments (reconciliation: unmatched, tenant claims, awaiting approval, not rent)
- ImportStatement (import dialog: source, file, preview, acknowledgement)
- PaymentInstructions (Settings → Payment instructions)
- Properties
- TenantLease
- Invoices
- Utilities
- Maintenance
- Tickets (tenant complaints and repair requests, M1-18)
- MoveOut
- Messages
- Reports (MRI tax)
- Agency
- LandlordPortal
- Import
- Settings (team, roles, payment instructions, security, audit, appearance)
- Privacy
- Billing

**Mobile app** (see `docs/MOBILE_APP_PLAN.md`):
- **Shared:** Welcome, AppLogin
- **Tenant:** TenantHome, TenantPay (How to pay), TenantPaid (I've paid), TenantReceipt, TenantStatement, TenantRequest, TenantTicket, TenantNotices, TenantProfile
- **Caretaker:** CaretakerHome, Caretaker (water readings), CaretakerCash, CaretakerInspection, CaretakerJob. The Account tab has no frame yet.
- **Manager/landlord:** ManagerHome, ManagerApprovals (Claims, Unmatched, Cash, Readings), ManagerTenant, ManagerAlerts, ManagerMore

If you edit the frames on the canvas, re-export or ask Claude to re-sync this folder.
