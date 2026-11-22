# Implementation Plan: Norgespris Limit Warnings for Every Location

**Branch**: `015-norgespris-limit-warnings` | **Date**: 2026-11-22 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/015-norgespris-limit-warnings/spec.md`

## Summary

The Norgespris warnings move from the selected location's bill to API spec 018's status of every location, and gain
two new kinds. All rules are pure and live in the dashboard slice; the banner gets the location list.

1. **Data (FR-001)**: `getNorgesPrisStatus()` and `useNorgesPrisStatus()` read
   `GET /api/electricity-cost/norgespris-status` every 5 minutes under `['cost', 'norgespris-status']`, so the car
   checkbox's invalidation of `['cost']` refreshes it (research R1). `HourPrice` gains the optional
   `spotEnergyPricePerKwh`.
2. **Limit rule (US1, US2, FR-002–FR-005)**: the pure `limitWarning(item, now)` in a new `norgesPris.ts` returns
   `over`, `approaching` (with days until the limit or the expected end) or `projected`, at most one per location
   (research R3). It replaces spec 012's `norgesPrisWarning(bill)`, which is removed, and the banner stops reading the
   bill.
3. **Expensive hours (US3, FR-006, FR-010)**: the pure `expensiveHours(day, price)` finds tomorrow's hours at
   ≥ 4 × the Norgespris price as Oslo hour ranges with the highest price (research R4). A new
   `useTomorrowPrices(ids)` reads tomorrow's prices only for locations whose warning needs them, sharing
   `useDayPrices`'s cache key (research R5).
4. **Banner (US4, FR-007–FR-009)**: `WarningBanner({ location, locations, onSelect })` keeps spec 012's capacity and
   usage lines for the selected location, then the limit lines and the expensive-hours lines for every active
   location, selected first, each naming its location. Each line links to `/` and selects its location (research
   R6, R7). `AppLayout` passes `active` and `select` from `useSelectedLocation`.

## Technical Context

**Language/Version**: TypeScript 5 (strict), React 19

**Primary Dependencies**: TanStack Query 5, React Router 7, shadcn/ui, Tailwind 4, lucide-react. **No new
dependencies.**

**Storage**: none.

**Testing**: Vitest + Testing Library + MSW.

- **`norgesPris.test.ts`** (pure):
  - `limitWarning`: over (at and above the limit), approaching at exactly 90 %, with days, today, tomorrow, the
    expected end, without a projection; projected below 90 %; nothing below 90 % within the limit; a null limit
  - `expensiveHours`: the 4 × threshold (equal counts), ranges across consecutive hours, a range to midnight, null
    and negative prices, a null or zero Norgespris price, unpublished day, the 23- and 25-hour days
  - `needsTomorrow` for each kind.
- **`api.test.ts`**: `getNorgesPrisStatus` requests the endpoint and returns the items.
- **`WarningBanner.test.tsx`**:
  - the cabin's over line while Hjemme is selected, urgent, on any route
  - approaching and projected lines with the contract's wording
  - the expensive-hours line, and no request for tomorrow's prices for a location within its limit
  - the order across locations; following a line selects its location
  - no Norgespris lines, and no error, when the status fails; spec 012's capacity and usage tests unchanged
  - the old Norgespris tests replaced; the "one request each" test no longer expects the bill.

**Target Platform**: a mobile-first browser SPA, at 375 px, in light and dark mode (SC-005).

**Project Type**: web (frontend SPA against the existing API)

**Performance Goals**: one status request per 5 minutes for all locations; tomorrow's prices only for locations over
or projected over (usually none or one), every 15 minutes as `useDayPrices` already does.

**Constraints**: API spec 018 deployed; Oslo time from the shared helpers; thresholds as named constants
(`APPROACHING_SHARE = 0.9`, `EXPENSIVE_FACTOR = 4`).

**Scale/Scope**:

- New: `norgesPris.ts` with tests, `getNorgesPrisStatus`, `useNorgesPrisStatus`, `useTomorrowPrices`, types.
- Changed: `WarningBanner` (and its tests), `AppLayout`, `HourPrice`, `warnings.ts` (Norgespris rule removed).

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle             | How the plan meets it                                                                                                                                               | Status |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| I. Feature slices     | Rules, hooks and banner stay in `features/dashboard`. `AppLayout` passes the location list in, so the dashboard doesn't reach into the locations slice's internals. | ✅     |
| II. One gateway       | `getNorgesPrisStatus` uses `api.get` with a typed result; the optional price field is normalised in the type.                                                       | ✅     |
| III. TanStack Query   | Stable keys under `cost` and `prices`; explicit `refetchInterval`; tomorrow's prices share `useDayPrices`'s key; nothing copied into state.                         | ✅     |
| IV. Forms             | No forms.                                                                                                                                                           | ✅ n/a |
| V. Session safety     | Nothing new stored or logged; the location id stays out of URLs beyond the existing price query.                                                                    | ✅     |
| VI. Typed, lint-clean | Strict types, a discriminated union for the warning kinds, existing banner styles.                                                                                  | ✅     |
| VII. Tests            | Pure tests for both rules, MSW tests for the banner and the API function.                                                                                           | ✅     |
| Oslo time             | Tomorrow's date, hour ranges, "today/tomorrow" and the reset date use the shared Oslo helpers.                                                                      | ✅     |

**Re-check after Phase 1**: unchanged, all pass.

## Project Structure

### Documentation (this feature)

```text
specs/015-norgespris-limit-warnings/
├── plan.md              # This file
├── research.md          # Phase 0: R1–R7
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── ui.md            # Phase 1: the texts and their order
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── components/AppLayout.tsx                 # passes active locations and select to WarningBanner
└── features/dashboard/
    ├── types.ts                             # + NorgesPrisStatus(Item); HourPrice.spotEnergyPricePerKwh?
    ├── api.ts / api.test.ts                 # + getNorgesPrisStatus
    ├── hooks.ts                             # + useNorgesPrisStatus, useTomorrowPrices
    ├── norgesPris.ts / .test.ts             # new: limitWarning, expensiveHours, needsTomorrow, constants
    ├── warnings.ts / .test.ts               # − norgesPrisWarning and its tests
    └── WarningBanner.tsx / .test.tsx        # every location's Norgespris lines, select on follow
```

**Structure Decision**: The warnings are about locations' use and cost, the dashboard slice's job, as in spec 012.
The location list and the select function come from `AppLayout`, which already reads them.

## Complexity Tracking

None. No principle is broken.
