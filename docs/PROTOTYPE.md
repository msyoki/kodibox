# Clickable prototype (apps/web)

A UI-only prototype of the whole product on typed demo data. No database, auth or backend. Later backend tasks replace the demo data with real queries and keep the UI. Frames in `docs/design/frames/` are the visual reference; tokens are in `docs/design/SCREEN_SPEC.md`.

## Run

```
pnpm install
pnpm --filter @kodibox/web dev      # http://localhost:3000  (/ redirects to /login)
pnpm --filter @kodibox/web build
```

Sign in with anything, enter any 6 digits for 2FA, land on `/dashboard`. Demo data is fixed (seeded PRNG) and DemoStore mutations reset on reload.

## Route map

| Route | Frame | P task | Replaced by backend task |
|---|---|---|---|
| `/login` | Login | P-01 (done) | E-04 auth |
| `/onboarding` | Onboarding | P-01 (done) | M1-16 |
| `/dashboard` | Main | P-01 (done) | M1-14 |
| `/payments`, `/invoices` | Payments, ImportStatement, Invoices | P-02, P-08 | M1-05, M1-07..M1-10 |
| `/settings/payment-instructions` | PaymentInstructions | P-08 | M1-06 |
| `/settings/appearance` | Settings (Appearance) | P-08 | theme preference (light, dark, system, `kb-theme` cookie) |
| `/onboarding` | Onboarding (7 steps) | P-01, P-08 | M1-16. Opens at step 4 today; see open items in `docs/PROGRESS.md` |
| `/properties`, `/tenants` | Properties, TenantLease, Import | P-03 | M1-01..M1-03 |
| `/tickets`, `/maintenance`, `/move-outs`, `/utilities` | Tickets, Maintenance, MoveOut, Utilities | P-04 | M1-18 and Phase 2 |
| `/messages`, `/landlords`, `/reports`, `/settings` | Messages, Agency, Reports, Settings, Privacy, Billing | P-05 | M1-12, M1-15, M1-17 |
| `/m`, `/m/tenant`, `/m/caretaker`, `/m/manager` | Tenant*, Caretaker*, Manager* | P-06 | Phase 3 mobile |

Unbuilt routes render `ComingSoon` (`src/components/coming-soon.tsx`) so nav links never 404.

## Mobile app prototype (apps/mobile)

The native prototype (Expo SDK 58, Expo Router) is a separate app with the same demo data. It is not the `/m` web routes above. Run it with the steps in the root `README.md` (Expo Go over USB with `adb reverse`). It has no auth, API, database or SMS: sign-in is UI only, and approvals change the in-memory demo state. Screen list and status: `docs/MOBILE_APP_PLAN.md` sections 3 and 13.

## Shared packages used by both prototypes

- `packages/demo` (`@kodibox/demo`): demo seed, queries, reconciliation samples and formatting. Amounts are `bigint` minor units.
- `apps/web/src/demo/adapt.ts` converts the shared bigint data to numbers at the boundary, so the web components stay unchanged. `apps/web/src/demo/recon.ts` (with `recon.test.ts`) holds the web reconciliation demo.
- `packages/ui/src/tokens.ts` is the single source of colour tokens. The web CSS variables in `apps/web/src/app/globals.css` mirror it, and a test keeps the keys in step. Light, dark and system themes are both supported.

## Layout

- `src/app/(app)/` authenticated shell (sidebar, top bar, "Demo mode" banner, providers).
- `src/app/m/` phone-like column (max 420px) plus `components/mobile/tab-bar.tsx`.
- `src/features/<feature>/components` page-level components; `src/components/ui` shared kit; `src/demo` data.
- Tokens: the source is `packages/ui/src/tokens.ts`; `src/app/globals.css` (`@theme`) mirrors it for Tailwind. Colours `bg surface border border-strong divider soft text muted brand brand-dark brand-soft brand-tint amber warning danger(-soft) ok(-soft) warn(-soft) info(-soft)`, radii `rounded-control|card|panel`, fonts `font-sans|font-mono`.

## UI kit (`@/components/ui`)

`cn()` is in `@/lib/cn`.

- `Button` (`variant` primary|secondary|ghost|danger, `size` sm|md|lg, all >=44px), `LinkButton` (same, takes `href`), `buttonClasses()`
- `Card`, `CardHeader({title,id?,action?})`
- `Badge` / `StatusPill` (`tone` ok|warn|danger|info|neutral)
- `Table({minWidth})`, `THead`, `TBody`, `TR`, `TH({align?})`, `TD({align?})` with a scrolling wrapper
- `Tabs({tabs:[{id,label,badge?,content}],defaultTab?})` client
- `Field({label,htmlFor,help?,error?})`, `Label`, `Input`, `Select`, `Textarea`, `Checkbox({label})`, `Switch({label})`
- `ProgressBar({value,tone,label,size})`, `Stat({label,value,sub?,progress?})`, `EmptyState({title,description?,action?})`
- `Dialog({open,onClose,title,description?,footer?})` native `<dialog>`; `ToastProvider` + `useToast().toast(msg, tone?)`
- `Money({minor,prefix?})` (integer minor units, mono font), `MaskedText({kind:'phone'|'id',value})`, `Avatar({name,size})`
- Shell helpers: `PageHeader({title,eyebrow?,actions?})`, `ComingSoon`, mobile `TabBar({tabs:[{label,href,badge?}]})`

## Demo data (`@/demo`)

Amounts are integer minor units (cents of KES); `kes(14000)` from `@/lib/money` converts shillings. Pages call functions, never raw arrays. Every function takes an optional `src: DemoData` as its LAST argument: omit it on server pages; client pages that must react to mutations pass `useDemoStore().data`.

`getOrganization, listPlans, getCurrentPlan, listMembers, listAuditEvents, listTemplates, listMessages, listDataRequests, listNotices, listLandlords, getLandlord, listRemittances(landlordId?), listProperties, getProperty(id), listUnits(propertyId), getUnit, listTenants(filter), getTenant(id), listLeases, listInvoices(filter), getInvoice(id), listPayments(filter), listUnmatched, listTickets(filter), getTicket(id), listExpenses(propertyId?), listMeterReadings(propertyId?), getBadgeCounts, getDashboard`. Formatting helpers in `@/demo/format` (`CHANNEL_LABEL`, `formatDate`, `formatWhen`). Persona constant: `DEMO_TENANT_ID` (Peter Otieno, B-12, balance KES 16,700).

Calibrated totals (November 2026): expected 1,284,000, collected 1,032,500, 150 units, 142 occupied, 6 unmatched payments (74,200), 3 cash awaiting approval, 9 open tickets. `Invoice.oldestUnpaidDays` drives arrears aging.

### DemoStore

`DemoStoreProvider` wraps `(app)` and `/m` layouts. In a client component:

```tsx
const { data, badges, actions } = useDemoStore();
const unmatched = listUnmatched(data);
actions.matchPayment(unmatchedId, tenantId, invoiceId);
```

Actions: `matchPayment, approveCash, rejectCash, updateTicketStatus, addTicketMessage, markRemitted, reset`. Each appends an audit event; sidebar badges update live. Add new actions additively.

## Conventions for parallel builders

- Each P task owns its route folders and `src/features/<its feature>` only. Never edit another task's pages.
- Changes to `components/ui` or `demo/` must be ADDITIVE: new files or new exports. Do not change existing signatures or seed numbers (other screens depend on the calibrated totals). New demo data goes in a new file merged additively, or new fields that are optional.
- Mask PII with `MaskedText`; never render raw phone or ID numbers. No real network calls.
- Use `ComingSoon` removal as the signal that a route is built. Keep accessibility: real buttons and labels, 44px targets, visible focus.
