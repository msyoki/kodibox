# Kodibox UI frames

Live canvas (view, click through in Play mode, comment): https://claude.ai/artifact/Ke5VipbbUBXbdSKF9JGhfj

`frames/` holds the source of all 35 screens (`*.dc.html`) plus the canvas layout (`canvas.json`). They are design mockups, not production code. They use the canvas runtime (`support.js`), so they don't render on their own when opened directly in a browser. Use the live canvas to view them, and treat these files as the reference for layout, copy, sample data and design tokens when building the real UI in `apps/web` and `apps/mobile`.

`SCREEN_SPEC.md` holds the design tokens (colours, fonts, spacing) and the product rules the frames follow.

## Screen inventory
**Web app:**
- Login
- Onboarding
- Main (dashboard)
- Payments (reconciliation)
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
- Settings (team, roles, security, audit)
- Privacy
- Billing

**Mobile app** (see `docs/MOBILE_APP_PLAN.md`):
- **Tenant:** AppLogin, TenantHome, TenantPay, TenantReceipt, TenantStatement, TenantRequest, TenantTicket, TenantNotices, TenantProfile
- **Caretaker:** CaretakerHome, Caretaker (water readings), CaretakerCash, CaretakerInspection, CaretakerJob
- **Manager/landlord:** ManagerHome, ManagerApprovals, ManagerTenant, ManagerAlerts

If you edit the frames on the canvas, re-export or ask Claude to re-sync this folder.
