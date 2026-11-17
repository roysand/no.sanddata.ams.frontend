# Implementation Plan: Show the Capacity Charge, the Norgespris Monthly Limit and the Exemptions

**Branch**: `007-capacity-charge-and-cap` | **Date**: 2026-11-17 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/007-capacity-charge-and-cap/spec.md`. Backend contract:
`no.sanddata.ams.api` `specs/008-full-electricity-price/contracts/endpoints.md`, section "Addendum 2026-11-17 (stories 6
and 7)" (API PR #24 and PR #25). Summary of the calls used here: [contracts/api-usage.md](contracts/api-usage.md).

## Summary

The dashboard gets a capacity charge card (step, amount, three peaks, kW to the next step, month navigation) from
`GET /api/electricity-cost/capacity`. The right-now card, the "What is in the price" dialog and the last-hours card
show when an hour is above the Norgespris monthly limit, from the new `cap` object. The out-of-date notes ("grid fixed
fee", "the monthly limit is not taken into account") are corrected. In the admin slice, the grid tariff page gets
capacity step tables per tariff, the Location pricing page gets the three flags, and the Taxes and VAT page gets the
two monthly limit kinds. Nothing is recomputed in the browser except the optional incl.-VAT-to-excl.-VAT conversion
while typing step amounts, which is shown before saving.

## Technical Context

**Language/Version**: TypeScript (strict), React 19, Vite, Node 22+

**Primary Dependencies**: TanStack Query 5, React Hook Form + Zod (`useFieldArray` for the step rows), shadcn/ui
(Card, Dialog, Table, Badge, Checkbox, Skeleton, Button), Tailwind 4. No new dependency.

**Storage**: N/A (API only)

**Testing**: Vitest + React Testing Library + user-event + MSW, as in `features/dashboard/SavingCard.test.tsx` and
`features/admin/GridTariffsPage.test.tsx`

**Target Platform**: Browser (desktop and phone width)

**Project Type**: Single-page web application

**Performance Goals**: One extra request per dashboard view (the capacity card); one request per grid tariff on the
grid tariff page.

**Constraints**: the API is the authority; against an older API the new fields are absent and nothing may break
(`cap` optional, flags defaulted to false in `api.ts`, capacity card shows the server's error).

**Scale/Scope**: about 10 changed and 6 new files across the `dashboard` and `admin` slices.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status |
|---|---|
| I. Feature-sliced | Pass. Dashboard parts in `src/features/dashboard/`, admin parts in `src/features/admin/`. The capacity card imports `useAuth` from `features/auth/useAuth` for the Admin link, as `PriceBreakdownDialog.tsx` already does. |
| II. One gateway | Pass. `api.get/post/put/delete` in each slice's `api.ts`; missing flags on an older API are normalised to `false` in `admin/api.ts`. |
| III. Query | Pass. `['cost', 'capacity', locationId, month]` (so admin mutations that invalidate `['cost']` refresh it), `['admin', 'grid-tariffs', tariffId, 'capacity-steps']`. Live refetch only for the current month (15 min); `enabled` on the location. The shown month is UI state in the card, not server data. |
| IV. Validated forms | Pass. Zod schemas in `admin/schema.ts`: step table (mirrors the API validator, commented as such), cap value (> 0, ≤ 99 999, ≤ 4 decimals), flags in the existing location pricing schema. |
| V. Session and access | Pass. Admin links are UX only; the pages stay under `AdminRoute`. |
| VI. Typed, lint-clean | Pass. Build, lint and Prettier before merge. |
| VII. Tests | Pass. New tests for the capacity card, the limit notes, the step dialog and schema, the flags and the new kinds; existing tests updated where the wording changes; MSW handler for `/capacity` added wherever the dashboard page is rendered. |

No deviations. Re-checked after Phase 1: still no deviations.

## Project Structure

### Documentation (this feature)

```text
specs/007-capacity-charge-and-cap/
├── spec.md
├── plan.md               # This file
├── research.md           # Decisions
├── data-model.md         # Types added or changed in the UI
├── contracts/
│   └── api-usage.md      # The API calls and fields this feature reads and sends
├── quickstart.md         # How to check it end to end
├── checklists/requirements.md
└── tasks.md              # Created by /speckit-tasks
```

### Source Code (repository root)

```text
src/features/dashboard/
├── types.ts                    # CHANGED: CapSplit, optional cap on CurrentRateCost/HourRateCost, CapacityCharge
├── api.ts / hooks.ts           # CHANGED: getCapacityCharge, useCapacityCharge
├── format.ts                   # CHANGED: osloMonth, addMonths, formatMonth, formatKw
├── capacity.ts                 # NEW: pure helpers (VAT exempt, average label, step label)
├── cap.ts                      # NEW: the Norgespris side of an hour, whether any kWh is above the limit
├── CapacityCard.tsx            # NEW (Story 1)
├── NowCard.tsx                 # CHANGED: note wording (Story 2), limit-reached note (Story 3)
├── PriceBreakdownDialog.tsx    # CHANGED: note wording, within/above-limit columns
├── RecentUsage.tsx             # CHANGED: above-limit note
├── SavingCard.tsx              # CHANGED: note wording
├── DashboardPage.tsx           # CHANGED: the capacity card after the saving card
└── *.test.ts(x)                # NEW and CHANGED

src/features/admin/
├── types.ts                    # CHANGED: flags on LocationPricing(+Input), cap kinds, CapacityStepTable(+Input)
├── api.ts / hooks.ts           # CHANGED: flag defaults; capacity step get/add/delete; useCapacitySteps, actions
├── schema.ts                   # CHANGED: capacity step table schema, cap value field, flags
├── pricing.ts                  # CHANGED: kindLabel and unit for the cap kinds
├── CapacityStepsSection.tsx    # NEW: a tariff's step tables, inside its card on GridTariffsPage
├── AddCapacityStepsDialog.tsx  # NEW: start date + step rows, optional incl.-VAT entry
├── DeleteCapacityStepsDialog.tsx # NEW
├── GridTariffsPage.tsx         # CHANGED: the section under each tariff's rates
├── LocationPricingPage.tsx     # CHANGED: flags column
├── EditLocationPricingDialog.tsx # CHANGED: three checkboxes
├── PriceRatesPage.tsx / AddPriceRateDialog.tsx # CHANGED: the two cap kinds, kWh per month
└── *.test.ts(x)                # NEW and CHANGED
README.md                       # CHANGED: dashboard and admin slice lines
```

**Structure Decision**: The existing feature slices; no new slice, no shared code moved to `lib/`.

## Design notes

- **Capacity card month**: `osloMonth(new Date())` is the default and the upper bound; previous/next buttons change a
  `month` state in the card. The month is always sent explicitly so the query key is stable. Refetch every 15 minutes
  only while the shown month is the current one.
- **Not set**: `set: false` shows "Capacity charge not available for <month>". An administrator sees links to
  `/admin/grid-tariffs` (steps) and `/admin/location-pricing` (tariff); others see "Ask an administrator". The API does
  not say which of the three reasons applies, so the text names them briefly.
- **VAT exempt**: `vat === 0` with `amount` not null means no VAT applies; the amount is labelled without "incl. VAT".
- **Fewer than three peaks**: "Average of N days" instead of "Average of the three highest days".
- **Which side has the limit**: the Norgespris side is `actual` on a Norgespris location and `comparison` on a spot
  location. The right-now card note shows only on a Norgespris location (on spot the limit does not change the
  household's own price); the dialog shows the split in whichever column is Norgespris.
- **Dialog split**: when the Norgespris side has `cap`, its column becomes two: "Within limit (x kWh)" from `parts` and
  "Above limit (y kWh)" from `cap.aboveCapParts`, plus a line with the blended rate (`ratePerKwh`). When
  `kwhWithinCap` is 0 only the above-limit column is shown.
- **Last-hours card**: on a Norgespris location, if any of the current window's hourly rows has `actual.cap` with
  `kwhAboveCap > 0`, a one-line note is shown. The card already uses `ratePerKwh`, which is the blended rate, so its
  cost stays correct.
- **Step dialog**: rows hold only "upper kW" and "amount"; the lower kW is shown read-only from the previous row (0 for
  the first) and the last row's upper is fixed to "and above". This makes "start at 0, contiguous, open last" true by
  construction; the schema still checks "upper above lower", the value range, 4 decimals and at most 50 rows (comment:
  mirrors `AddCapacityStepsValidator` in the API). A checkbox "Amounts include VAT (divide by 1,25)" converts on
  submit, rounding to 4 decimals, and the dialog shows the converted amounts in a column before saving.
- **Step table list**: one small table per dated step table with its status badge (`RateStatusBadge`); steps shown as
  "0–2 kW · 120,00 kr", the last as "100 kW and above". Delete is offered only for Upcoming tables.
- **Flags**: small badges ("Tax exempt", "VAT exempt", "Holiday home") in the Location pricing list; the PUT always
  sends all three.
- **Cap kinds**: labels "Norgespris monthly limit (home)" and "Norgespris monthly limit (holiday home)", shown as
  "5 000 kWh/month"; the field accepts a positive number up to 99 999.
- **Wording** (Story 2): price notes say "The supplier's monthly fee is not included. The grid capacity charge is a
  monthly amount, shown in its own card." The saving card says "The Norgespris monthly limit (5 000 kWh, 1 000 for a
  holiday home) is applied. Monthly fees are not included."
- **Tests**: every test that renders `DashboardPage` gets an MSW handler for `/api/electricity-cost/capacity`, because
  the test server errors on unhandled requests.

## Complexity Tracking

No constitution violations to justify.
