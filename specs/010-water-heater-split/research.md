# Research: Show Water Heating Apart from the Rest

Phase 0 of [plan.md](plan.md). The Technical Context had no open questions. These are the decisions behind it.

## R1. Where the rules live

- **Decision**: One pure module, `features/dashboard/waterHeater.ts`. Components only call it:
  - `restOf(total, heater)`: total − heater, at least 0, and `null` when either is `null`.
  - `heaterValue(part, unit)`: the part's `kwh`, or its `cost`, which can be `null`.
  - `sumParts(parts)`: the year view's month from its days. Kwh and minutes are sums. Cost is `null` if any day with
    a part has a `null` cost, the same rule as the API. The result is `null` when no day has a part.
  - `isPartlyMeasured(sampledMinutes, expectedMinutes)`: see R3.
  - `shareOf(heaterKwh, totalKwh)`: a share from 0 to 1, or `null` when the total is 0.
- **Rationale**: Four places must agree to the øre (SC-001, SC-004). One tested module is the cheapest way to ensure
  that, and the constitution requires tests for branching logic.
- **Alternatives**: Computing the rest inline in each component. That is small, but would repeat the null and negative
  rules four times.

## R2. Absent, null and zero

- **Decision**:
  - **`api.ts`** maps `item.waterHeater ?? null` for hourly items, daily items and the bill. An older API, or an MSW
    fixture without the field, then gives `null`.
  - **Everywhere else**, `null` means "no water heating figure": nothing is drawn, no line is shown, and the CSV
    cells are empty.
  - **A part with `cost: null`** still shows its kWh, but no kr split.
- **Rationale**: FR-001 and FR-009. Normalising in `api.ts` is what Principle II asks for. The existing fixtures keep
  working without edits (SC-002).
- **Alternatives**: Optional `waterHeater?:` in the types. Every caller would then handle `undefined` and `null`.

## R3. "Partly measured"

- **Decision**: A slot is partly measured when `expected − sampled > max(2, 1 % of expected)` minutes.
- **Expected minutes**:
  - **An hour:** 60.
  - **A day:** its Oslo length, `(dayStart(addDays(d, 1)) − dayStart(d)) / 60 000`, which is 1380, 1440 or 1500.
  - **A year-view month:** the sum of the days that have a part, so the days before the heater was connected don't
    make the month look partly measured. A whole day without samples is then not flagged in the month, only in the
    week and month views.
  - **The current hour or day:** the elapsed minutes so far, measured from the slot start to now.
- **Rationale**:
  - The API rounds each hour's minutes down to whole minutes. Holds are clipped at `now`. The newest sample can be up
    to a minute old.
  - Without a small tolerance, almost every current hour and many full days would say "partly measured" for less
    than a minute missing.
  - Two minutes, or 1 % (about 14 minutes of a day), only flags real gaps.
- **Alternatives**:
  - Strict "fewer than all minutes". That gives false alarms. FR-004 in the spec now states the same margin.
  - Not showing it at all. Then an outage would quietly make water heating look low.

## R4. How the split looks in the chart

- **Decision**:
  - **Bars (week, month and year):**
    - The current bar becomes two `<Bar>` segments with the same `stackId`: `heater` at the bottom in
      `var(--water-heater)`, and `rest` on top in `var(--usage)`.
    - The value label stays the slot's total, written from the top segment. The top corners are rounded on the top
      segment and the bottom corners on the bottom segment.
    - In a slot without a part, `heater` is `null` and `rest` is the total, so it looks as today.
    - The previous-period bar is unchanged and not stacked.
  - **Day view:** the existing total `Area` stays. A second `Area` for `heater` is drawn with a solid fill in
    `var(--water-heater)`, `fillOpacity` about 0,5 and a thin stroke. It is not stacked; it sits under the total
    because heater ≤ total. Hours without a part leave a gap rather than drawing 0.
  - **In kr:** a slot whose heater cost is `null` gets `heater: null` and `rest: total`.
  - **Legend:** "Water heating" with a swatch in `bg-water-heater`, only when some point in the current period has a
    heater value (FR-005).
  - **Detail line:** after the total, "· Water heating X · Everything else Y", in the chosen unit. "(partly
    measured)" is added after the water heating value when R3 says so. The previous-period comparison stays as it is.
- **Rationale**:
  - A stacked bar keeps the total visible and comparable with the ghost bar beside it.
  - In the day view, a second area under the line is the lightest change that still reads as "this much of it".
  - Recharts supports both inside the existing `ComposedChart` and `ChartContainer`.
- **Alternatives**:
  - Splitting the previous period too: twice the visual load. The spec's Assumptions leave it out.
  - Separate side-by-side bars for heater and rest: that loses the visible total.
  - A stacked area in the day view: it would hide the existing total outline, and with it the comparison style
    people know.

## R5. The bill line

- **Decision**: `WaterHeaterBillNote({ bill })` in `BillView.tsx` is rendered just below the total.
  - **Where:** in `BillInvoice` (History) and in `ExpectedBillCard` (Now).
  - **Text:** "Water heating: {kWh} kWh · {kr}", with the period after it:
    - "so far this month" when the first hour is in the month's first Oslo day
    - "since {formatOsloDate(firstHourUtc)}" otherwise
    - "in {month name}" for a Final month whose first hour is the month's first day.
  - **For an Estimate bill:** add "measured so far, not part of the estimate".
  - **Styling:** smaller, muted text, with no amount column, so it doesn't read as a bill line (FR-006).
  - **No line** when `bill.waterHeater` is `null`. When `cost` is `null`, the kr is left out.
- **Rationale**: The total stays the strongest figure. The note explains what share of the energy cost went to hot
  water, without suggesting it is part of the capacity charge or the fees (spec Assumptions).
- **Alternatives**:
  - A separate card: an extra place to look.
  - A line inside the Strøm part: wrong, because water heating covers both energy parts.

## R6. The Heater tab's figures

- **Decision**: `WaterHeaterEnergyCard({ locationId })` sits below `WaterHeaterCard` on `WaterHeaterPage`, and is
  rendered only when the page shows a heater.
  - **Today:** from `useTodayHourlyCost(locationId)`, key `['cost','hourly-today',id]`, refreshed every 5 min:
    - the sum of the hours' heater kWh, and its cost with the R1 null rule
    - its share of the sum of the hours' `consumptionKwh`.
  - **This month:** from `useMonthlyBill(locationId, currentMonth, true)`, key `['cost','bill',id,month]`, refreshed
    every 15 min: `bill.waterHeater`.
  - **"No measurements yet"** where a part is `null`.
- **Rationale**:
  - These are the same hooks and keys that Now uses, so moving between the tabs is served from the cache.
  - The month figure is then by construction the bill's (SC-004).
  - Today's figure is the sum of the same hourly parts the day chart draws.
- **Alternatives**:
  - Reading today from the chart's period query: its key depends on the chart's period choice.
  - A new endpoint: not needed, and FR-011 asks for none.

## R7. CSV columns

- **Decision**: Append these five columns, in this order, to both `hourlyCsv` and `dailyCsv`:
  - `Water heating (kWh)`: 3 decimals
  - `Water heating cost (kr)`: 2 decimals
  - `Everything else (kWh)`: 3 decimals
  - `Everything else cost (kr)`: 2 decimals
  - `Water heating sampled minutes`: an integer

  Each is empty when the row has no part, and the cost cells are empty when its cost is `null`. "Everything else" is
  computed with `restOf` before rounding.

- **Rationale**:
  - Appending keeps every existing column in place, so a spreadsheet that reads the old columns by position keeps
    working.
  - The header is the same for every location (spec US4 scenario 4).
- **Alternatives**: Adding the columns only when there is data. The layout would then change between locations and
  over time.

## R8. The heater colour

- **Decision**: Add `--water-heater` to `:root` and to the dark theme in `src/index.css`, plus
  `--color-water-heater: var(--water-heater)` in the `@theme` block, the same way as `--usage`.
  - **Hue:** warm, about oklch(0.68 0.16 45) in light and oklch(0.75 0.13 45) in dark.
  - **Contrast:** against `--usage` (blue, hue 262) and against the card background in both themes, checked by hand
    at 375 px.
- **Rationale**:
  - Warm against blue reads as "hot water" and stays apart for the common colour-vision deficiencies, because they
    differ in lightness as well as hue.
  - A token keeps light and dark mode in one place (Principle VI).
- **Alternatives**: A darker shade of `--usage`. It is too close to tell apart in a small bar.
