# Implementation Plan: Admin Pages for the Electricity Price Data

**Branch**: `005-pricing-admin-pages` | **Date**: 2026-11-16 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/005-pricing-admin-pages/spec.md`. Backend contract: `no.sanddata.ams.api` `specs/008-full-electricity-price/contracts/endpoints.md` (PR #23).

## Summary

Three Admin pages in the existing `admin` slice that follow the Norgespris page (feature 004): Location pricing (a table with an edit dialog), Grid tariffs (a card per tariff with its rates, a new tariff dialog and an add rate dialog) and Taxes and VAT (three sections with an add dialog). The past-date warning with its confirmation becomes one shared component, also used by the Norgespris dialog. The Norgespris page loses its unused Tax field.

## Technical Context

**Language/Version**: TypeScript (strict), React 19, Vite, Node 22+

**Primary Dependencies**: React Router 7, TanStack Query 5, React Hook Form + Zod, shadcn/ui (Radix), Tailwind 4. No new dependency.

**Testing**: Vitest + React Testing Library + user-event + MSW, as in `features/admin/NorgesPrisPage.test.tsx`

**Constraints**: Oslo date decides "today or earlier" (`lastOsloDays` from `features/dashboard/format.ts`, the helper the constitution names). The API stays the authority.

## Constitution Check

| Principle | Status |
|---|---|
| I. Feature-sliced | Pass. All new files in `src/features/admin/`; routing and menu edits in `app/routes.tsx` and `components/MenuPanel.tsx`. |
| II. One gateway | Pass. `api.get/post/put/delete`; failures surface as `ApiError`. |
| III. Query | Pass. Hooks in `hooks.ts` with hierarchical keys (`['admin', 'location-pricing']`, `['admin', 'grid-tariffs']`, `['admin', 'price-rates']`); mutations invalidate them and the `cost` and `prices` keys. |
| IV. Validated forms | Pass. RHF + Zod in `schema.ts`, rules that mirror the API commented as such. |
| V. Session and access | Pass. Pages under `AdminRoute`; menu entries for Admins only; the API enforces. |
| VI. Typed, lint-clean | Pass. No `any`; shadcn primitives only. |
| VII. Tests | Pass. Vitest/RTL/MSW beside the code. |

No deviations.

## Project Structure

```text
src/
├── app/routes.tsx                           # CHANGED: three routes under AdminRoute
├── components/MenuPanel.tsx (+ Header.test) # CHANGED: three menu entries
└── features/admin/
    ├── types.ts / api.ts / hooks.ts         # CHANGED: location pricing, grid tariffs, price rates
    ├── schema.ts                            # CHANGED: shared amount helper; markup, tariff, tariff rate and price rate schemas
    ├── pricing.ts                           # NEW: formatting (percent, kind labels) and VAT conversion
    ├── PastDateConfirm.tsx                  # NEW: the warning and confirmation checkbox, shared by every add dialog
    ├── LocationPricingPage.tsx, EditLocationPricingDialog.tsx
    ├── GridTariffsPage.tsx, CreateGridTariffDialog.tsx, AddGridTariffRateDialog.tsx, DeleteGridTariffRateDialog.tsx
    ├── PriceRatesPage.tsx, AddPriceRateDialog.tsx, DeletePriceRateDialog.tsx
    ├── NorgesPrisPage.tsx, AddNorgesPrisRateDialog.tsx   # CHANGED: no tax; use PastDateConfirm
    └── *.test.ts(x)                         # NEW and CHANGED
README.md                                    # CHANGED: admin slice line
```

## Design notes

- **Form values are text**, converted on submit (`amountOf`). VAT is typed as a percentage and sent as `percent / 100` computed on the digits (via a decimal string shift) so `25,5` becomes `0.255` without floating point noise.
- **`today`** is passed into the schema factories (`lastOsloDays(new Date(), 1)[0]`) so tests can fix it.
- **Query invalidation** after every change: the admin key touched plus `['cost']` and `['prices']`. Location pricing changes also invalidate `['admin', 'location-pricing']` and nothing else of the admin locations.
- **Error text**: `ApiError.message`; the pages do not depend on error codes.
- **Select**: the tariff choice uses the shadcn `Select` with a "None" item (value `none`, sent as `null`).
