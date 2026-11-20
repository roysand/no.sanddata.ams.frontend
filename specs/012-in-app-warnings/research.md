# Research: Warnings Inside the App

Phase 0 of [plan.md](plan.md). The Technical Context had no open questions. These are the decisions behind it.

## R1. The capacity limit for this hour

- **Decision**: A day's peak is its highest hourly kWh. The month's average is the mean of the three highest daily
  peaks, or of the days so far when there are fewer than three. The next step starts at `L = step.upperKw` (kWh/h, the
  same number as kW).
  - **The other days:**
    - `others` = this month's top peaks from the capacity figures, without today's (`peak.date !== today`). That is the
      three best days other than today, or the two best when today is among the top three.
    - The two highest values in `others` are `o1 ≥ o2`. A missing value counts as 0, which covers the first days of
      the month.
  - **The limit for today:**
    - With at least two other days, today's peak lifts the average to the next step when
      `(o1 + o2 + T) / 3 ≥ L`, so the limit is `T* = 3L − o1 − o2`. It is assumed that `T` is then among the top
      three, which it must be to change the average.
    - With fewer than three days in the month, the average is over `n` days, including today, and `T* = nL − Σ others`.
  - **This hour:**
    - Its kWh so far is `s`, after `m` minutes.
    - Its projection is `p = s × 60 / m`, used only when `m > 10`.
    - Today's peak so far is `t`: the highest completed hour today, from today's hourly figures, without the current
      hour.
    - **It warns** when `p ≥ T*` and `p > t`. An hour that doesn't beat today's own peak can't change the average.
  - **What it says:**
    - **The limit for the rest of the hour:** `(T* − s) / ((60 − m) / 60)` kW, rounded down to one decimal.
    - **Already past the limit:** if `T* − s ≤ 0`, the step is already lifted, and the text says "This hour has lifted
      the capacity step above L kW".
  - **No warning:** in the top step (`upperKw` null), without capacity figures (`set` false or `step` null), or on any
    missing input.
- **Rationale**:
  - FR-001, FR-002 and the spec's edge cases.
  - Linear extrapolation is the simplest honest forecast of an hour. The 10-minute rule avoids judging an hour by
    seconds.
  - Today's peak so far keeps the rule from warning about an hour that can't count.
- **Alternatives**:
  - Warning whenever the average is within 10 % of the next step. Roy rejected this; it doesn't say what to do now.
  - Asking the API for a forecast. It doesn't exist, and the choice was app only.

## R2. The usual power: one request, a median per hour and weekday

- **Decision**:
  - **The request:** `useHeatmap` already loads the last `HEATMAP_WEEKS = 4` weeks of hourly figures
    (`getHourlyCostPage`, key `['cost','heatmap',id,last]`, refreshed hourly).
  - **Sharing it:** its `queryFn` now returns the raw items, and `useHeatmap` maps them with
    `select: heatmapFrom`. The new `useUsualPower(id)` uses the same key and request, with
    `select: (items) => usualPower(items, now)`.
  - **`usualPower(items, now)`:**
    - It takes the items with the same Oslo weekday and hour as `now`, using the heatmap's `osloParts` formatter.
    - It returns the median of their `consumptionKwh` (kWh in one hour = average kW), and `weeks`, the number of
      values. That is 0–4, or 5 on a clock-change day.
    - With an even count, the median is the mean of the two middle values.
  - **The rule needs `weeks ≥ 3`.**
- **Rationale**:
  - FR-003 and FR-009: no new kind of request.
  - On History the heatmap and the warning share one fetch. On the other pages the request is made once an hour.
  - A median of four is robust against one unusual day.
- **Alternatives**:
  - A separate query for the same data: it would double the 4-week request on History.
  - The heatmap's average: one evening with guests would lift it.

## R3. The power now

- **Decision**:
  - **From:** `useLastHourPower(id)`: the last 60 minutes of per-minute kWh, refreshed every minute.
  - **The power now:** the mean of `consumptionKwh × 60` over the readings in the last 15 minutes.
  - **Stale:** if the newest reading is older than 6 minutes, the same `STALE_AFTER_MS` as `currentPowerKw`, there is
    no power now, and no warning.
  - **Too few readings:** with fewer than 5 readings in those 15 minutes, there is no warning.
- **Rationale**:
  - FR-003: 15 minutes smooths a kettle or a heat pump's start-up.
  - The stale limit is the one the Now card already uses.
- **Alternatives**: The single latest minute. One kettle would trigger it.

## R4. The texts

- **Decision**: See [contracts/ui.md](contracts/ui.md).
  - **Capacity:** "This hour may lift the capacity step above {L} kW. Stay under {limit} kW for the rest of the hour."
    When the limit is already passed: "This hour has lifted the capacity step above {L} kW."
  - **Usage:** "{Location} uses {now} kW now, about {ratio}× the usual {usual} kW for a {weekday} at this hour."
  - **Numbers:** nb-NO, with one decimal for kW. The ratio is rounded to a whole number.
  - **Weekday:** the English name ("Saturday"), from the same Oslo date.
- **Rationale**: FR-002 and FR-004. The capacity line says what to do now. The usage line says how far from normal the
  use is.
- **Alternatives**: Kroner instead of kW. The step's cost is on the capacity card; the action is in kW.

## R5. The banner and its place

- **Decision**:
  - **The component:** `WarningBanner({ location })` renders a `section`, `role="region"`, labelled "Warnings for
    {name}", with one `Link to="/"` per warning, capacity first.
  - **Colours:** the capacity line uses the destructive colours (money is at stake this hour). The usage line uses the
    muted warning style of the key reminders.
  - **Placement:** `AppLayout` renders `{selected && <WarningBanner location={selected} />}` before `<KeyReminderBanner
/>`, in the same `px-4` area (US3 scenario 2).
  - **On an error:** each hook's error, or missing data, simply leaves its warning out (FR-008).
- **Rationale**: One banner area at the top, with the most urgent item first. The link goes to Now, which shows the
  current hour, the capacity card and the recent usage (FR-006).
- **Alternatives**: One merged component for keys and warnings. They have different audiences (administrators versus
  everyone) and data, so they stay two components in one area.

## R6. Recomputing over time

- **Decision**:
  - The rules take `now` as a parameter, and the banner passes `useNow(60_000)`, the existing hook that ticks every
    minute.
  - With the per-minute and current-hour queries refreshing every minute, a warning appears or goes within a minute
    (FR-007, SC-001).
- **Rationale**: Pure rules with an explicit clock are easy to test at exact minutes. The ticking hook is already used
  for "updated N minutes ago".
- **Alternatives**: `Date.now()` inside the rules. Tests would then need fake timers everywhere.

## R7. The Norgespris limit, read from the expected bill

- **Decision**: `norgesPrisWarning(bill)` uses the current month's `MonthlyBill` (`useMonthlyBill(id, month, true)`,
  key `['cost','bill',id,month]`, which Now already reads, refreshed every 15 minutes).
  - **The two lines:**
    - `total` = `quantity` of the `strom` line `SpotEnergy`: all the month's kWh, so far + projected.
    - `within` = `quantity` of the `nettleie` line `NorgesPrisCredit`: the kWh within the limit, the same split.
  - **When it warns:** `bill.status` is `Estimate`, the credit line exists, `bill.projection` is not `null`, and
    `total − within > 0,5` kWh. The margin ignores rounding.
  - **What it gives:**
    - `limitKwh = within`, since the credit then stops exactly at the limit
    - `projectedKwh = total`
    - `soFarKwh = total − projection.kwh`
    - `passed = soFarKwh ≥ limitKwh`.
- **Rationale**:
  - The app is never sent the limit itself (5 000 or 1 000 kWh, from the price rates and the location's holiday-home
    flag, which only administrators see).
  - The bill's two quantities give it exactly when the projection is over. That is the case Roy chose (warn once
    projected over), and it needs no API change.
- **Alternatives**:
  - Warning within 10 % of the limit. That needs the limit before it is reached, so a field in the API's bill. Left out
    by Roy; noted in the spec's Assumptions.
  - Using the hourly figures' cap split. They only show hours already above the limit, not the projection.
