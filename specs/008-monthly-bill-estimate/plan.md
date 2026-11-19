# Implementation Plan: Show the Bill for the Month, Estimated and Final

**Branch**: `008-monthly-bill-estimate` | **Date**: 2026-11-19 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/008-monthly-bill-estimate/spec.md`. Backend contract:
`no.sanddata.ams.api` `specs/010-monthly-bill-estimate/contracts/endpoints.md` (API PRs #27 to #32). Summary of the
calls used here: [contracts/api-usage.md](contracts/api-usage.md).

## Summary

The dashboard gets an "Expected bill" card for the current month and the History page a "Bill" card with month
navigation, both drawing the server's `MonthlyBill` from `GET /api/electricity-cost/bill` through one shared
`BillView` (parts, lines, "Not set", incomplete reasons). Number formatting and the reason texts live in a pure
`bill.ts` with unit tests. The admin Location pricing dialog and list get the supplier monthly fee, and the markup help
text and the "not included" notes are corrected. Nothing is calculated in the browser: amounts are the server's,
rounded for display.

## Technical Context

**Language/Version**: TypeScript (strict), React 19, Vite, Node 22+

**Primary Dependencies**: TanStack Query 5, React Hook Form + Zod, shadcn/ui (Card, Table, Badge, Button, Skeleton),
Tailwind 4, lucide-react. Native `<details>` for expanding parts (research R6). No new dependency.

**Storage**: N/A (API only)

**Testing**: Vitest + React Testing Library + user-event + MSW, as in `features/dashboard/CapacityCard.test.tsx` and
`features/admin/LocationPricingPage.test.tsx`

**Target Platform**: Modern browsers, phone-first layout (the dashboard is used on phones)

**Project Type**: Single-page web application (frontend of a separate API)

**Performance Goals**: One request per view; the current month refreshes every 15 minutes (research R2)

**Constraints**: Oslo month boundaries via `format.ts` helpers; amounts never re-added in the browser (R3); the
invoice table must fit a phone (quantity and unit price stack under the line name on narrow screens)

**Scale/Scope**: 2 new components + 1 shared view, 1 helper module, 1 hook, 1 API function; 2 admin files changed;
4 text changes

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle             | Check                                                                                                                                                                 | Status |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| I. Feature-sliced     | Bill views in `features/dashboard` (HistoryPage is there); admin changes in `features/admin`. `useAuth` from the auth slice's public hook, as `CapacityCard` does     | Pass   |
| II. One gateway       | `getMonthlyBill` in `dashboard/api.ts` via `api.get`; admin fee via the existing `setLocationPricing`; old-API gap normalized in `admin/api.ts`                       | Pass   |
| III. TanStack Query   | `useMonthlyBill` in `dashboard/hooks.ts`, key `['cost', 'bill', id, month]`, `enabled`, explicit `refetchInterval`; no server data in state (only the selected month) | Pass   |
| IV. Validated forms   | Fee rule in `admin/schema.ts`, commented as mirroring `Validation.InvalidMonthlyFee`                                                                                  | Pass   |
| V. Session safety     | No tokens or PII touched; admin link is UX only, the API guards the page                                                                                              | Pass   |
| VI. Typed, lint-clean | Types in `types.ts`; unknown line codes typed as `string` rather than asserted                                                                                        | Pass   |
| VII. Tests            | Pure helpers and schema unit-tested; components tested through MSW with the July reference bill                                                                       | Pass   |

Post-design re-check: unchanged, all pass. No complexity tracking needed.

## Project Structure

### Documentation (this feature)

```text
specs/008-monthly-bill-estimate/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── api-usage.md     # Phase 1
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
src/features/dashboard/
├── types.ts                  # + MonthlyBill, BillPart, BillLine, BillProjection
├── api.ts                    # + getMonthlyBill
├── hooks.ts                  # + useMonthlyBill
├── format.ts                 # + formatKwh2 (two fixed decimals)
├── bill.ts / bill.test.ts    # new: names, formats, basis text, incomplete reasons, VAT-exempt
├── BillView.tsx              # new: parts, lines, totals, incomplete note (shared)
├── ExpectedBillCard.tsx/.test.tsx   # new: dashboard card (US1, US4)
├── BillCard.tsx/.test.tsx    # new: History card with month navigation (US2, US4)
├── DashboardPage.tsx         # place ExpectedBillCard after CapacityCard
├── HistoryPage.tsx           # place BillCard between UsageChart and ExportCard
├── NowCard.tsx, UsageChart.tsx, PriceBreakdownDialog.tsx, ExportCard.tsx   # note texts (US5)
└── (their tests)             # updated where they assert the old texts

src/features/admin/
├── types.ts                  # LocationPricing.supplierMonthlyFee, input field
├── api.ts                    # normalize missing supplierMonthlyFee to null
├── schema.ts / pricingSchema.test.ts   # optional fee field
├── EditLocationPricingDialog.tsx       # fee field, server error on field, markup help text
└── LocationPricingPage.tsx/.test.tsx   # fee column, explanation text
```

**Structure Decision**: The existing single-project layout; all work stays in the `dashboard` and `admin` slices.

## Delivery order

1. US3 (admin fee) — small and independent; lets the production July check start.
2. Types, API, hook and `bill.ts` with tests (shared foundation).
3. US2 + US4 on History (the July reference test proves the line layout).
4. US1 + US4 on the dashboard (reuses `BillView`).
5. US5 texts.

One PR per step is possible; steps 2–4 can also go in one PR.
