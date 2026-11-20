# Research: Water Heating in the "Last 3 Hours" Chart

Phase 0 of [plan.md](plan.md). The API contract is `no.sanddata.ams.api` →
`specs/017-water-heater-power/contracts/endpoints.md`; [contracts/api.md](contracts/api.md) lists what this app reads.

## R1. The window on whole 5 minutes (US2, FR-005, FR-006)

- **Facts**:
  - `useRecentUsage` sets `startMs` to now − 3 h, rounded down to the minute.
  - `bucketKw` counts 36 steps of 5 minutes from there, so the steps run 17:37, 17:42, …
  - The API's heater steps start on whole 5 minutes (17:35, 17:40, …).
- **Decision**: a pure `recentWindow(now)` in `series.ts` gives
  `startMs = floor5(now) − 35 × 5 min`.
  - That is 36 steps on whole 5 minutes, the last one being the step going on now.
  - `useRecentUsage` uses it instead of its own rounding. Yesterday's start stays `sameHourYesterday(startMs)`.
  - The totals still run from `startMs` to now, today and yesterday, so the comparison stays like for like (FR-006).
  - The elapsed time is between 2 h 55 min and 3 h, where it was exactly 3 h before. The difference is at most 5
    minutes of use, and both days lose it alike.
- **Rationale**: the meter's per-minute readings can be grouped on any boundary, but the heater's steps are fixed by
  the API. One rule gives the same steps for every location, and there is one code path.
- **Alternatives considered**:
  - Re-bucketing the heater per minute. Not possible: the API answers per 5 minutes.
  - Asking the API with an odd `from` (17:37). Rejected: the API then gives a first step 17:35 that covers only 17:37
    onwards, and every later step is still on whole 5 minutes, so they stay offset.

## R2. The house's power in a step that is not complete

- **Facts**: `bucketKw` sums a step's minute kWh × 12. That is the average over all 5 minutes, so the step going on now
  (and any step with missing minutes) reads too low: 2 minutes at 6 kW show as 2,4 kW. The heater's `powerKw` is the
  average over its sampled time only.
- **Decision**: `bucketKw` divides by the minutes that have a reading (`kWh ÷ readings × 60`).
  - A full step is unchanged.
  - The step going on now shows its real average.
- **Rationale**: both lines must be on the same basis, or the heater area would be clipped by the house's line in the
  step going on now (FR-003). It also removes the dip at the right end of today's chart.
- **Changed test**: `series.test.ts` › `buildRecentUsage` has a case with a partial step. Its expected kW changes from
  the 5-minute average to the average over the minutes it has.

## R3. Fetching the heater steps (FR-009, FR-010, FR-011)

- **Decision**: `useRecentWaterHeater(locationId, startMs, enabled)` in `hooks.ts`.
  - It calls `getWaterHeaterPower(id, iso(startMs), iso(startMs + 3 h))`.
  - Its key is `['water-heater', 'power', id, startMs]`.
  - It refreshes every minute and has `retry: false`.
  - It is enabled only when `hasWaterHeater` and `startMs` are known.
  - `startMs` comes from `useRecentUsage`'s data, so both queries use the same window.
- **Rationale**:
  - A separate query means a heater failure never holds back the house's power (FR-009).
  - A location without a heater makes no request (FR-010).
  - The `startMs` in the key moves every 5 minutes, which is also when a new step begins.
- **Alternatives considered**:
  - One combined query. Rejected: a failure in the heater request would fail the whole card.
  - Asking with no window (the API default). Rejected: the API's default `from` is to − 3 h, not on whole 5 minutes.

## R4. Matching and drawing (FR-001–FR-004)

- **Decision**: `buildRecentUsage` takes `heater?: WaterHeaterPowerStep[]`. Each point gets:
  - `heater` (kW, or `null`)
  - `heaterDrawn = min(heater, current)`
  - `rest = max(0, current − heater)`
  - `partly`.

  Steps are matched by `(start − startMs) ÷ 5 min`.

  - **The area** uses `heaterDrawn`, so it never rises above the house's line (FR-003).
  - **The detail line** uses `heater` itself.
  - **`partly`** is `true` for a finished step (start + 5 min ≤ now) when `300 − sampledSeconds > 120`. This is spec
    010's margin, `max(2 min, 1 %)` of 5 minutes.
  - **Where the house has no reading** in a step, there is no point to draw under. The step has no heater area, and
    the detail line says "no reading".

- **Drawing**: an `Area` with `dataKey="heaterDrawn"` in `var(--water-heater)`, `fillOpacity` 0.5. It is drawn after
  yesterday's line and before the house's area, as `UsageChart` does in the day view.
  - **Legend:** "Water heating", only when any point has a heater value.
  - **Detail line:** "19:40 · 7,4 kW · Water heating 2,0 kW · Everything else 5,4 kW · yesterday 6,1 kW", as one
    string, which spec 013's chart showed is easier to test.

## R5. Water heating in the 3 hours (US3, FR-008)

- **Decision**: `heaterKwh = Σ powerKw × sampledSeconds ÷ 3600` over the steps from `startMs` to now, and
  `share = min(1, heaterKwh ÷ totalKwh)` (`shareOf` from `waterHeater.ts`).
  - The card shows "Water heating: 3,1 kWh of 21,17 kWh (15 %)" under the "Yesterday" line.
  - The line is hidden when there are no heater steps.
  - The share is left out when the house's kWh is 0.
- **Rationale**: this is the API's own energy rule (SC-002 of API spec 017), so it matches the hourly figures.

## R6. Errors and the note (FR-009)

- **Decision**: when the heater query fails, the chart is drawn without water heating, and a muted line reads "Water
  heating could not be loaded." under the legend. While it loads, the chart draws without it, with no skeleton.

## R7. What stays as it is

- Yesterday's line stays a single total (FR-007). Only today's heater window is fetched.
- The cost figures, the Norgespris note and the empty and error states of the card are unchanged.
- The card gets `hasWaterHeater` from `DashboardPage` (`selected.hasWaterHeater === true`), as the tab bar does.
