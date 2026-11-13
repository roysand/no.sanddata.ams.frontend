# Tasks: Now and Today Dashboard

**Input**: Design documents from `/specs/003-now-and-today-dashboard/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/prices-endpoint.md, quickstart.md

**Tests**: Included. The constitution (Principle VII) requires tests for new branching logic and behaviour-level component tests with MSW.

**Organization**: Grouped by user story. Frontend paths are relative to this repo. API tasks are in the sibling repo `no.sanddata.ams.api` (separate PR, merged first).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story the task belongs to (US1 to US6)

---

## Phase 1: Setup

- [X] T001 Create branch `feature/prices-endpoint` in `no.sanddata.ams.api` and read `src/Features/ElectricityCost/Endpoints/GetCurrentHourCostEndpoint.cs` and `Services/HourlyCostProvider.cs` as the pattern to follow
- [X] T002 [P] Add `features/dashboard/index.ts` exporting the public surface other slices may use (hooks, types, formatters), per plan.md structure
- [X] T003 [P] Add semantic colour tokens for cheap, normal and expensive (text and background) to both `:root` and `.dark` in `src/index.css`, and register them in the `@theme inline` block

---

## Phase 2: Foundational (blocks all user stories)

**API repo (`no.sanddata.ams.api`)**

- [X] T004 Add `GetDayPricesQuery`, validator and handler in `src/Features/ElectricityCost/` returning one item per real Oslo hour (23, 24 or 25) with the enrolled model's rate from `CostCalculator`, `null` when price or exchange rate is missing (contract: `contracts/prices-endpoint.md`)
- [X] T005 Add `GET /api/electricity-cost/prices` endpoint (`locationId` required, `date` optional yyyy-MM-dd defaulting to today in Europe/Oslo) with the same auth and 404 rule as the other cost endpoints in `src/Features/ElectricityCost/Endpoints/GetDayPricesEndpoint.cs`
- [X] T006 [P] Add API tests in `tests/Features.Tests/ElectricityCost/`: 24 items on a normal day, 23 and 25 on DST days, rate equals the hourly cost endpoint's rate, `null` for missing price, 404 for an inaccessible location
- [X] T007 Run `dotnet test` in the API repo, then commit, push and open the API PR

**Frontend**

- [X] T008 [P] Add `DayPrices` and `HourPrice` types (fields as in data-model.md: `hourStart` UTC ISO string, `ratePerKwh` number or `null`) to `src/features/dashboard/types.ts`
- [X] T009 [P] Add `getDayPrices(locationId, date?)` to `src/features/dashboard/api.ts` using `api.get`, and `useDayPrices(locationId)` with `refetchInterval` of 15 minutes and `enabled: !!locationId` to `src/features/dashboard/hooks.ts`
- [X] T010 [P] Add Oslo-time helpers `osloDayStartUtc` reuse plus `osloDayHours(now)` (real hours of the Oslo day, 23/24/25) and `sameHourYesterday(hourStart)` to `src/features/dashboard/format.ts`, with tests in `src/features/dashboard/format.test.ts` including both DST days
- [X] T011 [P] Create `src/features/dashboard/priceLevel.ts`: `buildPriceDay(items, now)` returning hours with `level` (lowest third rated hours cheap, highest third expensive, else normal; null without rate), `isBest` (up to 4 lowest rated hours; none when all rates equal), `isPast`, `isCurrent`; tests in `priceLevel.test.ts` (normal day, ties, all equal, missing rates, DST)
- [X] T012 Create `src/app/ThemeProvider.tsx`: follow device by default, optional `light`/`dark` stored in `localStorage` key `ams.theme` (try/catch), toggles the `dark` class on `<html>`, exposes `useTheme()`; wire it in `src/main.tsx`; tests in `src/app/ThemeProvider.test.tsx` (follows device, explicit choice persists, storage unavailable)
- [X] T013 Create `src/components/SidePanel.tsx` on the existing Radix dialog primitive: right-side sheet closing on Escape, outside tap and a Close control, focus trapped while open, focus returned to the opener; test in `src/components/SidePanel.test.tsx`
- [X] T014 Replace `src/components/AppLayout.tsx` with the mobile shell (header, outlet with side gutters, sticky bottom tab bar, safe-area padding) and remove the fixed background image from `body` in `src/index.css`; keep wide screens centred with a max width

**Checkpoint**: API endpoint merged and shell, theme and price helpers ready.

---

## Phase 3: User Story 1 - See what electricity is costing me right now (P1) 🎯 MVP

**Goal**: "Right now" card with power in kW, cost so far this hour, price per kWh, price pill and trend against yesterday.

**Independent Test**: Open Now for a location with current-hour data; all values and the pill show, and the missing-price state shows "Price not available yet" while power remains.

- [X] T015 [P] [US1] Add `currentPowerKw(minuteItems, now)` (latest minute bucket × 60, `null` when older than 5 minutes) and `hourTrend(current, yesterdayRow, elapsedFraction)` (null when yesterday has no row or no price) to `src/features/dashboard/series.ts`, with tests in `series.test.ts`
- [X] T016 [P] [US1] Add `useYesterdayHour(locationId)` to `src/features/dashboard/hooks.ts` (hourly cost for the same hour yesterday, `enabled` on selection, `refetchInterval` 5 minutes)
- [X] T017 [US1] Create `src/features/dashboard/NowCard.tsx` replacing `CurrentHourCard`: eyebrow with time and pricing model, large kW value, price pill (text and dot, never colour only: Cheap now, Normal price, Expensive now, Price not available yet), cost so far, price per kWh, trend line, rank sentence ("4th cheapest of 24 hours today") and the alternative-model comparison sentence; loading skeleton and no-readings empty state
- [X] T018 [US1] Component tests in `src/features/dashboard/NowCard.test.tsx` with MSW: normal data, cheap/normal/expensive pill, missing price, no readings, yesterday missing hides trend
- [X] T019 [US1] Use `NowCard` on `DashboardPage.tsx` and delete `CurrentHourCard.tsx`; update `DashboardPage.test.tsx` mocks accordingly

**Checkpoint**: US1 works on its own.

---

## Phase 4: User Story 4 - Comfortable on a phone, in light or dark (P1)

**Goal**: Bottom tab bar, large touch targets, theme following the device with a manual override.

**Independent Test**: At 360 px nothing scrolls sideways, the tab bar works, and the theme button cycles follow device, light, dark and is remembered.

- [X] T020 [P] [US4] Create `src/components/TabBar.tsx` (Now, History, Locations; label becomes "All locations" for users with two or more active locations) using `NavLink`, `aria-current`, 56 px high targets and safe-area bottom padding
- [X] T021 [P] [US4] Add a theme cycle button (follow device, light, dark, with icon and accessible label) to the header actions, using `useTheme()` from T012
- [X] T022 [US4] Add routes `/history` and `/locations` under the shell in `src/app/routes.tsx` (History initially renders the usage chart once US3 lands; until then a placeholder page)
- [X] T023 [US4] Tests in `src/components/TabBar.test.tsx` and `src/components/AppLayout.test.tsx`: active tab, label for single versus several locations, theme button cycle persists
- [ ] T024 [US4] Responsive pass: verify the Now page at 360, 430 and 1024 px in light and dark, fix overflow and contrast issues (WCAG AA on text and key chart elements), and record results in the PR

---

## Phase 5: User Story 2 - Find the cheapest hours today (P2)

**Goal**: 24-hour price timeline with the current hour outlined, best hours marked and a readout on tap.

**Independent Test**: With a full day of prices, 24 bars show, the current hour is outlined, 3 to 4 best hours are marked, tapping a bar shows its price; missing prices show placeholders.

- [X] T025 [US2] Create `src/features/dashboard/PriceTimeline.tsx` using `ChartContainer` and a Recharts `BarChart`: bar colour by level, past hours muted, current hour outlined, best-hour mark, axis labels every 6 hours, legend, "Best hours still to come" sentence, readout for the selected bar, keyboard-selectable bars with descriptive labels
- [X] T026 [US2] States: loading skeleton, "Prices not published yet" empty state when every rate is null, placeholders for null hours (not counted for best hours)
- [X] T027 [US2] Component tests in `src/features/dashboard/PriceTimeline.test.tsx` with MSW: 24 bars, best hours count 3 to 4, current hour marked, tap readout, all rates equal shows no best hours, DST day with 23 bars
- [X] T028 [US2] Add `PriceTimeline` to `DashboardPage.tsx` below `NowCard`

---

## Phase 6: User Story 3 - Explore usage and cost over time in one chart (P2)

**Goal**: One chart with Day/Week/Month/Year tabs, kWh/NOK toggle and previous period as a dashed line.

**Independent Test**: Each period and unit combination shows the right series, the previous period is dashed, touching the chart shows both values, and the three old charts are gone.

- [X] T029 [P] [US3] Create `src/features/dashboard/periods.ts`: `periodRange(period, now)` and `previousRange(period, now)` in Europe/Oslo for day (hours), week (7 days), month (days of the current month) and year (months), with tests in `periods.test.ts` including DST days and month lengths
- [X] T030 [P] [US3] Add `getHourlyConsumption`, `getDailyCostRange(locationId, fromUtc, toUtc)` and hourly cost with `from`/`to` to `src/features/dashboard/api.ts`; add `usePeriodData(locationId, period, unit)` to `hooks.ts` loading current and previous ranges (Year lazily on tab open, cached for 15 minutes) with hierarchical query keys
- [X] T031 [US3] Extend `series.ts` with `buildUsageSeries(period, unit, current, previous)` returning aligned points, totals, previous totals and delta percent (totals only over points with a current value), with tests in `series.test.ts`
- [X] T032 [US3] Create `src/features/dashboard/UsageChart.tsx`: segmented Day/Week/Month/Year and kWh/NOK controls (44 px targets, `aria-pressed`), headline total with delta chip, Recharts `ComposedChart` with area plus line for the current period and dashed `Line` for the previous period, touch and arrow-key readout showing both values, legend, `aria-label` and a text summary; persist `{period, unit}` in `localStorage` key `ams.chart`
- [X] T033 [US3] States: loading skeleton, "Nothing to chart yet", "Cost needs prices" when NOK is selected without prices (kWh stays usable), no ghost line when the previous period has no data, Year with fewer than 12 months
- [X] T034 [US3] Component tests in `src/features/dashboard/UsageChart.test.tsx` with MSW: tab and unit switching, ghost line present or absent, readout, empty and missing-price states
- [X] T035 [US3] Replace `PowerChart`, `HourlyCostChart` and `DailyCostChart` on `DashboardPage.tsx` with `UsageChart`, delete the three files and their imports/mocks, and build `src/features/dashboard/HistoryPage.tsx` (larger chart plus month summary and Spot versus NorgesPris comparison note) for the `/history` route
- [ ] T036 [US3] Measure the Year tab load time against the real API and record it in the PR; if it exceeds 3 seconds, open a follow-up for server-side monthly totals (research R5)

---

## Phase 7: User Story 5 - See all my locations at a glance (P2)

**Goal**: "All locations" page for users with two or more active locations.

**Independent Test**: With two or more active locations the totals equal the sum of the cards and a card opens that location; with one location no overview or switcher appears.

- [X] T037 [P] [US5] Create `src/features/overview/summary.ts`: totals, share of total, ordering by cost descending, `incomplete` flag handling, with tests in `summary.test.ts`
- [X] T038 [US5] Create `src/features/overview/hooks.ts` using `useQueries` over active locations for current hour cost, last-hour power and daily cost for Today, Week or Month (via `features/dashboard/index.ts` only); a failed location yields an incomplete summary instead of failing the page
- [X] T039 [US5] Create `src/features/overview/LocationSummaryCard.tsx` (name, pricing model, power now, kWh, cost, 24-point sparkline, share bar, opens that location) and `OverviewPage.tsx` (Today/Week/Month segmented control, combined power, kWh and cost, change versus previous period, loading skeletons, no-readings and missing-price states, incomplete marker)
- [X] T040 [US5] Make the Locations route show `OverviewPage` for two or more active locations and the existing `LocationsPage` for one; keep location management reachable from the menu; selecting a card sets `ams.selectedLocation` and navigates to `/`
- [X] T041 [US5] Make the location name in the header a switcher with a chevron only when the user has two or more active locations, linking to the overview (`src/components/Header.tsx`)
- [X] T042 [US5] Component tests in `src/features/overview/OverviewPage.test.tsx` with MSW: totals equal card sums, order by cost, card opens location, one location shows no overview or switcher, one failing location marks incomplete

---

## Phase 8: User Story 6 - Know who is signed in and reach admin pages (P2)

**Goal**: User chip with account panel, admin-only menu button and panel.

**Independent Test**: Regular and admin accounts both see the user chip; only the admin sees the menu button; panels close with Escape and return focus.

- [X] T043 [P] [US6] Create `src/components/AccountPanel.tsx` (email, role, Sign out calling `logout`) using `SidePanel`
- [X] T044 [P] [US6] Create `src/components/MenuPanel.tsx` with Dashboard, My locations and an Administration section (Users, Locations) shown only when `roles` includes `Admin`, using `SidePanel` and `NavLink`
- [X] T045 [US6] Rewrite `src/components/Header.tsx` for the mobile shell: user chip (initials, email, role), theme button, menu button hidden for users without extra pages, location name button from T041
- [X] T046 [US6] Tests in `src/components/Header.test.tsx`: user chip content, regular user has no menu button, admin sees the menu and both admin entries, Sign out ends the session, Escape closes and returns focus, role is still enforced by `AdminRoute` (existing `AdminRoute.test.tsx` stays green)

---

## Phase 9: Polish and Cross-Cutting

- [ ] T047 [P] Accessibility pass: keyboard and screen-reader walk-through of Now, History, Locations and both panels; colour is never the only signal; reduced-motion respected for skeletons
- [X] T048 [P] Remove dead code and unused exports from the old dashboard components; update `src/features/dashboard/index.ts`
- [X] T049 Run `npm run format`, `npm run lint`, `npm run build` and `npm test`; fix everything they report
- [ ] T050 Work through every scenario in `quickstart.md` against the dev server with the new API endpoint and record the results in the PR
- [ ] T051 Commit, push and open the frontend PR describing the two-repo dependency (API PR first)

---

## Dependencies and Execution Order

- **Phase 1 → Phase 2** first. T004 to T007 (API) block T009 and any task that calls the prices endpoint for real, but frontend tasks can proceed against MSW mocks in parallel.
- **Phase 3 (US1) and Phase 4 (US4)** are both P1 and need Phase 2. US1 needs T008 to T011 and T014; US4 needs T012 and T014.
- **US2** needs T008, T009, T011. **US3** needs T010 and T014. **US5** needs T014, T020 and the dashboard public exports (T002). **US6** needs T013 and T045 builds on T041.
- Stories are independent otherwise and can be done in priority order: US1, US4, US2, US3, US5, US6.

## Parallel Opportunities

- Setup: T002 and T003 together.
- Foundational: T006 with T004/T005 (different files), T008 to T013 together.
- US1: T015 and T016 together. US3: T029 and T030 together. US6: T043 and T044 together.
- Different developers can take US2, US3 and US5 once Phase 2 is done.

## Implementation Strategy

- **MVP**: Phases 1 to 4 (US1 and US4): the new shell, theme and "right now" card, with the API endpoint merged for later stories.
- **Increment 1**: US2 (price timeline) and US3 (one chart), which together replace the old dashboard.
- **Increment 2**: US5 (all locations) and US6 (user header and admin menu).
- Open the API PR as soon as T007 is done so the frontend can be tested against real prices.
