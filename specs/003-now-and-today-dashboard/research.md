# Research: Now and Today Dashboard

All open points from the spec and the plan's Technical Context are resolved here.

## R1. Where do full-day hourly prices come from?

- **Finding**: `GET /api/electricity-cost/hourly` is built from consumption rows, so it returns only hours that have consumption. Hours without readings and hours in the future are absent. The API already stores prices per zone and hour (`IElectricityPriceRepository`, `GetByRegionAndHourAsync`), so the data exists.
- **Decision**: Add a read-only endpoint `GET /api/electricity-cost/prices` in the API repo that returns the enrolled model's per-kWh rate for every hour of an Oslo day for one location (see `contracts/prices-endpoint.md`). User confirmed this approach.
- **Rationale**: Smallest change that gives full 24 bars, upcoming best hours and a price level computed from the whole day.
- **Alternatives considered**: Frontend-only from hourly cost (no future hours, partial day); skipping the timeline (loses the main "act on it" value).

## R2. Price level and best hours

- **Decision**: Compute on the client from the day's rated hours. Cheap is the lowest third of rated hours, expensive the highest third, normal otherwise. Best hours are the 4 lowest-priced hours; ties at the boundary are included only up to 4. When all rates are equal (for example a Norgespris location), everything is "normal" and no best hours are marked.
- **Rationale**: Matches the spec and mockup, needs no server logic and is unit-testable.
- **Alternatives considered**: Server-side levels (more API surface for no benefit).

## R3. Current power (kW)

- **Finding**: `PowerChart` already derives watts from minute consumption: `kWh per minute × 60 000 = W`.
- **Decision**: Current power is the latest minute bucket in the last-hour minute query, converted to kW, with `refetchInterval` of 1 minute. If the latest bucket is older than 5 minutes, show "no recent reading".
- **Alternatives considered**: Averaging the last 5 minutes (smoother but lags); kept as a possible tuning step.

## R4. Trend against the same hour yesterday

- **Decision**: Compare cost so far this hour with yesterday's cost for the same elapsed part of the hour using yesterday's hourly row scaled by elapsed minutes. Hide the trend if yesterday has no row or no price.
- **Rationale**: Uses existing hourly cost data. A scaled comparison is good enough for a trend arrow.

## R5. Data for Week, Month and Year tabs

- **Finding**: `GET /api/electricity-cost/daily` accepts `from` and `to`; `/api/consumption` supports `hour` and `minute` granularity with `from`/`to`. The hourly provider computes cost per hour, so very long hourly ranges are slow.
- **Decision**: Day tab uses hourly cost (cost) and hourly consumption (kWh) for today and yesterday. Week and Month use daily cost for the current and previous period. Year uses daily cost for the current and previous year, summed per month on the client.
- **Risk**: A full year of daily data may be slow because cost is computed per hour on the server. Mitigation: request Year data lazily when the tab is opened, cache it for 15 minutes, show a loading state, and measure in the quickstart. If it is too slow, a follow-up adds server-side monthly totals.
- **Alternatives considered**: A new monthly endpoint now (more API work before we know it is needed).

## R6. Multi-location overview data

- **Decision**: Use `useQueries` to call the existing per-location endpoints (current hour cost for power and cost now, daily cost for the period) for each active location, with the Today, Week and Month ranges. Totals are summed on the client. A failed location shows as incomplete instead of failing the whole page.
- **Rationale**: Honors "no combined backend report". Users have a handful of locations.
- **Alternatives considered**: A combined overview endpoint (out of scope).

## R7. Theme

- **Finding**: `index.css` already defines `:root` and `.dark` token sets and a `dark` custom variant.
- **Decision**: A `ThemeProvider` toggles the `dark` class on `<html>`, follows `prefers-color-scheme` by default, and stores an explicit choice in `localStorage` (wrapped in try/catch). Add semantic tokens for cheap, normal and expensive in both themes. Remove the fixed background image from `body` for the new shell.
- **Alternatives considered**: Separate stylesheet per theme (duplicates tokens).

## R8. Side panels

- **Decision**: Build `SidePanel` on the existing Radix dialog primitive (already used for dialogs) so focus trapping, Escape and return-focus come for free, styled as a right-side sheet.
- **Alternatives considered**: Adding a new sheet dependency (not needed).

## R9. Routing and persistence

- **Decision**: Tabs are routes: `/` (Now), `/history`, `/locations`. The existing `/locations` page (My locations management) keeps its content for single-location users and becomes the overview for users with two or more locations, with management reachable from the menu. Selected location, period and unit persist in `localStorage` under the existing `ams.` key prefix.

## R10. Accessibility

- **Decision**: Colour is never the only signal: the price pill has text, bars carry a best-hour mark and the current hour an outline. Chart points are reachable by arrow keys; the summary above the chart gives the same numbers as text. Touch targets are at least 44 px.
