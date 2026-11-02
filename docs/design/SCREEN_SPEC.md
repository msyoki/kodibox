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
- Sample data: realistic Kenyan names, units like B-12, KES amounts with commas, M-Pesa codes like TK2F9RT4KD. Use `[PAYBILL]` for paybill numbers. Mask PII (phone 0712 ••• 512, ID ••••4821). No lorem ipsum.

## Design tokens
Font: Manrope (UI), 'IBM Plex Mono' (amounts, codes, references). Bg #F6F5F1, surface #FFFFFF, border #E2E0D8, divider #EEECE5, soft #FAF9F6, text #14201E, muted #5A635F, brand #0E4D45 (dark #0A3C36, soft #E2EEEB / #F1F7F5), amber #F0B54A (fills only, dark text on it), warning #D9822B (dots/bars), danger text #9B2C1A on #FBE7E1, ok text #1C6B44 on #E1F2E8, warn text #8A4B08 on #FDEBD3, info text #1D4F91 on #E3ECF9. Radius 10–16px. Cards: white, 1px border, radius 14, padding 20.

## Web screens (W=1440)
Fluid PAGE: root `min-height: 100vh; display:flex; flex-wrap:wrap`; sidebar `flex: 1 1 232px`; main `flex: 999 1 560px; min-width:0`. No fixed px width on root. Tables inside `overflow-x:auto` boxes with a min-width. Sections in flex-wrap rows. `$preview` height = the H given for your screen; design content to fit roughly that height.
Copy the sidebar from Main.dc.html (logo, org switcher, nav, footer card) but use THIS nav list (set active=true on your screen's item):
Dashboard→Main.dc.html · Properties & units→Properties.dc.html · Tenants & leases→TenantLease.dc.html · Invoices→Invoices.dc.html · Payments→Payments.dc.html (badge '6') · Utilities→Utilities.dc.html · Expenses & repairs→Maintenance.dc.html · Notices & move-outs→MoveOut.dc.html · Messages→Messages.dc.html · Landlords→Agency.dc.html · Reports & tax→Reports.dc.html · Settings→Settings.dc.html
Org: "Mwangi Properties" (an agency managing 150 units in Riverside Court–Kilimani, Baraka Flats–Ruaka, Mvule Apartments–Nyali, Tumaini Shops–Thika Rd commercial). Logged-in user: Wanjiru Mwangi (Owner).

## Mobile screens (390×844, native app via Expo)
Fixed root `width: 390px; height: 844px; box-sizing: border-box; overflow: hidden`. No fake OS status bar. Bottom tab bar where the persona has tabs (copy TenantHome's tab bar):
- Tenant tabs: Home→TenantHome.dc.html, Payments→TenantStatement.dc.html, Requests→TenantRequest.dc.html, Profile→TenantProfile.dc.html
- Caretaker tabs: Tasks→CaretakerHome.dc.html, Readings→Caretaker.dc.html, Cash→CaretakerCash.dc.html, Jobs→CaretakerJob.dc.html
- Manager tabs: Home→ManagerHome.dc.html, Approvals→ManagerApprovals.dc.html, Tenants→ManagerTenant.dc.html, Alerts→ManagerAlerts.dc.html
Tenant persona: Peter Otieno, B-12 Riverside Court, balance KES 16,700 (rent 14,000, service 1,300, water 1,200, late fee 200), due 5 Nov. Caretaker: Otieno Ouma at Baraka Flats / Mvule. Manager: Wanjiru.

## Product rules to reflect in UI copy
Kodibox never holds money (rent goes to landlord's own paybill/bank). Every money change is audited and reversible, never deleted. Cash recorded by caretakers needs manager approval (maker-checker). 2FA for owners/managers. SMS has opt-out. Tenants can export their data / request corrections. No eviction/lockout features—notices only.
