# Kodibox screen-building spec (for agents)

Folder: C:\Users\Hp\AppData\Local\Temp\claude\c--Users-Hp-Documents-HomeProjects-Kodibox\1cf7d8b4-b973-47e0-b973-a308e9009635\scratchpad\kodibox-design\project\
FIRST read `Main.dc.html` (web template) and `TenantHome.dc.html` + `TenantPay.dc.html` (mobile templates) in that folder. Copy their structure, fonts, colours and patterns exactly. Write ONLY the files assigned to you. Do NOT edit any other file, do NOT touch canvas.json, do NOT publish anything, do NOT render/screenshot/verify in a browser.

## Format rules (break one and the screen silently fails)
- File skeleton exactly as the templates: `<!doctype html>`, `<head>` with charset, `<title>`, and the line `<script src="./support.js"></script>` EXACTLY; `<body><x-dc><helmet>` (Google Fonts link with `&amp;` in the URL + `<style>body{margin:0}...</style>`) `</helmet>` markup `</x-dc>` then `<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":W,"height":H}}'>class Component extends DCLogic { renderVals() { return {...}; } }</script>`.
- Close every non-void element, quote every attribute. All styling inline `style="..."`. No classes/CSS rules except body margin and a/a:hover colours in helmet.
- `{{hole}}` = dotted lookup into renderVals() only; NO expressions. Compute strings (including style strings) in renderVals.
- Repeats: `<sc-for list="{{items}}" as="it" hint-placeholder-count="N">`. Conditionals: `<sc-if value="{{flag}}" hint-placeholder-val="{{ true }}">`. Events: `onClick="{{handler}}"` with handlers from renderVals using this.setState. No innerHTML, no script-built DOM, no network, no emoji, no iframes, no global key handlers. Icons = small inline stroke `<svg aria-hidden="true">`.
- Links between screens: `<a href="Other.dc.html">` (style the `<a>` as the button; never nest a button in it).
- Accessibility: real `<button type="button">`, `<a href>`, `<input>` inside `<label>`; `aria-label` on icon-only buttons; touch targets ≥44px; text contrast ≥4.5:1 (muted text #5A635F on light bg is the lightest allowed).
- Sample data: realistic Kenyan names, units like B-12, KES amounts with commas, M-Pesa codes like TK2F9RT4KD. Use the demo paybill `000111` (literal) in frames updated or added on 2026-11-15. Older frames keep the `[PAYBILL]` placeholder until they are updated. Mask PII (phone 0712 ••• 512, ID ••••4821). No lorem ipsum.

## Design tokens
Font: Manrope (UI), 'IBM Plex Mono' (amounts, codes, references). The mobile app loads both through `@expo-google-fonts/manrope` and `@expo-google-fonts/ibm-plex-mono` (`apps/mobile/src/theme/fonts.ts`); it does not use system fonts. Bg #F6F5F1, surface #FFFFFF, border #E2E0D8, divider #EEECE5, soft #FAF9F6, text #14201E, muted #5A635F, brand #0E4D45 (dark #0A3C36, soft #E2EEEB / #F1F7F5), amber #F0B54A (fills only, dark text on it), warning #D9822B (dots/bars), danger text #9B2C1A on #FBE7E1, ok text #1C6B44 on #E1F2E8, warn text #8A4B08 on #FDEBD3, info text #1D4F91 on #E3ECF9. Radius 10–16px. Cards: white, 1px border, radius 14, padding 20.
- **Mobile headers:** light (white surface on the #F6F5F1 background) for app screens. The Welcome hero is the only dark header (brandDark #0A3C36).
- **Text on green** (brand #0E4D45 or brandDark #0A3C36): white (#FFFFFF) for headings and amounts; soft tint (#D7E7E3 or #CFE3DE) for captions and secondary text. Never grey text on green.
- **Dark theme:** take the palette from `packages/ui/src/tokens.ts` (`darkColors`). The same token keys drive web CSS variables and mobile, so do not hand-pick colours for new frames.

## Web screens (W=1440)
Fluid PAGE: root `min-height: 100vh; display:flex; flex-wrap:wrap`; sidebar `flex: 1 1 232px`; main `flex: 999 1 560px; min-width:0`. No fixed px width on root. Tables inside `overflow-x:auto` boxes with a min-width. Sections in flex-wrap rows. `$preview` height = the H given for your screen; design content to fit roughly that height.
Copy the sidebar from Main.dc.html (logo, org switcher, nav, footer card) but use THIS nav list (set active=true on your screen's item):
Dashboard→Main.dc.html · Properties & units→Properties.dc.html · Tenants & leases→TenantLease.dc.html · Invoices→Invoices.dc.html · Payments→Payments.dc.html (badge '6') · Utilities→Utilities.dc.html · Expenses & repairs→Maintenance.dc.html · Notices & move-outs→MoveOut.dc.html · Messages→Messages.dc.html · Landlords→Agency.dc.html · Reports & tax→Reports.dc.html · Settings→Settings.dc.html
Org: "Mwangi Properties" (an agency managing 150 units in Riverside Court–Kilimani, Baraka Flats–Ruaka, Mvule Apartments–Nyali, Tumaini Shops–Thika Rd commercial). Logged-in user: Wanjiru Mwangi (Owner).

## Mobile screens (390×844, native app via Expo)
Fixed root `width: 390px; height: 844px; box-sizing: border-box; overflow: hidden`. No fake OS status bar. Bottom tab bar where the persona has tabs (copy TenantHome's tab bar):
- Tenant tabs: Home→TenantHome.dc.html, Payments→TenantStatement.dc.html, Requests→TenantRequest.dc.html, Profile→TenantProfile.dc.html
- Caretaker tabs: Tasks→CaretakerHome.dc.html, Readings→Caretaker.dc.html, Cash→CaretakerCash.dc.html, Jobs→CaretakerJob.dc.html
- Manager tabs: Home→ManagerHome.dc.html, Approvals→ManagerApprovals.dc.html, Tenants→ManagerTenant.dc.html, Alerts→ManagerAlerts.dc.html, More→ManagerMore.dc.html (five tabs; the tab grid is `repeat(5, minmax(0, 1fr))`)
- Caretaker tabs in the app also include Account. No frame exists for it yet, so the frames show four tabs.
Tenant persona: Peter Otieno, B-12 Riverside Court, balance KES 16,700 (rent 14,000, service 1,300, water 1,200, late fee 200), due 5 Nov. Caretaker: Otieno Ouma at Baraka Flats / Mvule. Manager: Wanjiru.

## Product rules to reflect in UI copy
Kodibox never holds money (rent goes to landlord's own paybill/bank). Every money change is audited and reversible, never deleted. Cash recorded by caretakers needs manager approval (maker-checker). 2FA for owners/managers. SMS has opt-out. Tenants can export their data / request corrections. No eviction/lockout features—notices only.

**Payment copy (ADR 0007, payment-agnostic):**
- Never write "Pay with M-Pesa", "Pay now", "Send M-Pesa prompt", "STK", "Request payment", "Daraja", "webhook", "C2B", "callback", "Connect M-Pesa" or "verified with Safaricom". Kodibox does not initiate or detect payments.
- Use "How to pay", "Pay rent", "I've paid", "Pending verification", "Statement import", "Verified claim", "Cash" and "Not rent".
- Tenants see the landlord's paybill, account reference (unit code) and bank details, each with a copy button. Say "your landlord's paybill", never "Kodibox collects" or "Kodibox receives" rent.
- A tenant claim is "Pending verification" until a statement line matches it or a manager approves it. Rent is not marked paid before then.

## Frames added or changed after the first set (2026-11-15)
Added (new files, same format):
- `Welcome.dc.html` (mobile): brandDark hero, amber Get started, sign in link.
- `TenantPaid.dc.html` (mobile): paste the M-Pesa message, parsed code, amount, date and account, warnings, Send for verification, pending notice.
- `ManagerMore.dc.html` (mobile, Manager "More" tab): profile card, module grid, appearance, security and privacy, sign out.
- `ImportStatement.dc.html` (web dialog): source and format, file, preview counts with conflicts and possible duplicates, acknowledgement before import.
- `PaymentInstructions.dc.html` (web, Settings → Payment instructions): paybill and bank sources with copy buttons, account reference rules, no credentials.

Changed:
- `TenantPay.dc.html` is now "How to pay" (paybill, account, bank, copy buttons, M-Pesa steps, I've paid). It replaces the STK prompt.
- `TenantHome.dc.html`: amber "Pay rent" and the hint line "Or Paybill 000111 · Account B-12". The fourth quick action is "I've paid".
- `TenantReceipt.dc.html`: adds a "Recorded from" row (Statement import, Verified claim or Cash).
- `ManagerApprovals.dc.html`: four segments (Claims, Unmatched, Cash, Readings). Claim rows have Approve and Reject. Unmatched rows have the suggestion, Assign and Not rent.
- `ManagerHome.dc.html`, `ManagerTenant.dc.html`, `ManagerAlerts.dc.html`: five tabs with More, and no STK or "Request payment" copy. Home actions are Send reminder, Record expense and Import statement.
- `Payments.dc.html`: Import statement, tabs Unmatched, Tenant claims, Awaiting approval, Not rent. The Safaricom verification line is gone.
- `Settings.dc.html`: Payment instructions and Appearance in the subnav.
- `Onboarding.dc.html`: seven steps; step 4 is Payment instructions (no Daraja fields).
- `Main.dc.html`, `TenantLease.dc.html`, `Login.dc.html`, `Messages.dc.html`, `Reports.dc.html`, `Billing.dc.html`: payment copy only.

Known gaps:
- `canvas.json` was not regenerated, so the five new frames are not on the live canvas until someone re-syncs it.
- The caretaker Account tab has no frame.
- The onboarding frame shows step 4 because the app opens there. The target is step 1 for a new Organization.
