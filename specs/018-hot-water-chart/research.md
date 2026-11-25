# Research: Hot Water Used, on the Heater Tab

## R1 – Reading the hot water

- **Decision**: `getHotWater(locationId, period, date)` →
  `api.get<HotWater>('/api/locations/{id}/water-heater/hot-water?period={period}&date={yyyy-MM-dd}')`. Both are always
  sent, so the answer never depends on the server's idea of today.
- **Rationale**: Principle II. The API's fields need no normalising: it is new, and an API without it answers 404.

## R2 – The query

- **Decision**: `useHotWater(locationId, period, date, isCurrent)`, with:
  - key `['water-heater', 'hot-water', locationId, period, date]`;
  - `placeholderData: keepPreviousData`, so the old bars stay while the next period loads, as in the usage chart;
  - `refetchInterval` 5 minutes only when `isCurrent`, and `staleTime` 5 minutes.
- **Rationale**: a past period doesn't change (except by the API's calibration, which a reload picks up); the current
  one grows by the minute, and the API samples about once a minute.

## R3 – Periods: date, title and how far back

- **Decision**: `hotWaterView(period, offset, now)` gives `{ date, title, canGoBack }`:
  - **day**: `date` = today + offset days; title "Today", "Yesterday", else "Wed 18 Nov" (with the year when not this
    year), as the usage chart.
  - **week**: the ISO week, Monday to Sunday. `date` = the Monday of this week + 7 × offset; title "This week" for
    offset 0, else "Week 47 · 16–22 Nov" (ISO week number; the year added when not this year).
  - **month**: the 1st of this month shifted by offset; title "November", with the year only when not this year, as
    the usage chart.
  - **year**: `{year}-01-01`; title "2026".
  - **canGoBack**: the period's first day is after `HISTORY_START = '2026-11-24'`.
- **Rationale**: the usage chart's `periodPlan` has rolling "last 7 days", not the ISO week the API answers, so the hot
  water card needs its own small rule set; titles reuse the same wording.
- **Alternatives**: extend `periodPlan` with an ISO week mode (touches a tested, widely used module for one card).

## R4 – Rows for the chart

- **Decision**: `hotWaterRows(answer)` builds one row per part of the whole period from `from` to `to`: for a day,
  every hour start from `from` in steps of one hour (so 23 or 25 hours fall out of the UTC instants); for a week or
  month, every Oslo date; for a year, every month. Each row: `key`, `label` (axis: "07", "Mon", "18", "Nov"), `span`
  (tooltip: "07:00–08:00", "Monday 23 Nov", "November"), `litres` (null for a gap and for parts after now),
  `partial` (sampledMinutes < 90 % of the part's minutes), and `litresFull` / `litresPartial` for the two bar series.
- **Partly recorded**: drawn in the same bar position as a second, paler series (stacked with the full one, one of
  them always 0), so it reads as a lighter bar.
- **Rationale**: drawing the whole period keeps the axis still while today fills in, as the API's `from`/`to` intend.

## R5 – The card

- **Decision**: `HotWaterCard({ locationId })`: header "Hot water used", `Segmented` Day/Week/Month/Year, the arrows
  and the title (as the usage chart); content: "Total V40 used {n} L" in large type (with "so far" for the current
  period), the bar chart (`h-48`) in `--color-water-heater`, the partly recorded legend only when a bar is partial,
  and the note. An empty answer (total null) shows the "No hot water recorded" text instead of the chart. Errors in
  the card only. A `figure` with an `aria-label` summary ("Hot water used, Today: 125 L in total, most at 07:00").
- **Axis ticks**: every 3 hours for a day, every day for a week, every 5 days for a month, every month for a year.
- **Placement**: between `WaterHeaterCard` and `WaterHeaterEnergyCard`, rendered like the energy card only once the
  heater state has said there is a heater.
