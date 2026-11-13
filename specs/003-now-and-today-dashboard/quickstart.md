# Quickstart: validating Now and Today

## Prerequisites

- Node 22+, `npm install` done in this repo.
- API with the new prices endpoint running (see `contracts/prices-endpoint.md`) and `VITE_API_BASE_URL` empty so the Vite `/api` proxy is used.
- Two test accounts: a regular user with one location, and an administrator with at least two active locations.

## Run

```bash
npm run dev          # open the printed URL on a phone-sized viewport (360 px)
npm test             # unit and component tests
npm run lint && npm run build
```

## Validation scenarios

1. **Right now (US1)**: sign in, open Now. Power in kW, cost so far, price per kWh, the price pill and the yesterday trend are visible without scrolling at 360 px.
2. **Missing price (US1, edge)**: with price data absent for the hour, the pill reads "Price not available yet", cost shows a dash and power remains.
3. **Price timeline (US2)**: 24 bars appear, the current hour is outlined, 3 to 4 best hours are marked, tapping a bar shows its price.
4. **Usage chart (US3)**: switch Day, Week, Month, Year and kWh/NOK; the previous period appears as a dashed line; touching the chart shows both values.
5. **Theme and phone (US4)**: switch device theme and the in-app theme button; reload and confirm the choice is kept. No horizontal scroll at 360 px.
6. **Overview (US5)**: as the multi-location user, open All locations; combined totals equal the sum of the cards; tap a card to open its Now tab. As a single-location user, no switcher and no overview.
7. **Header and menu (US6)**: user chip shows initials, email and role; only the administrator sees the menu button with Users and Locations; Escape closes panels and returns focus.
8. **Year performance**: open the Year tab and note the load time; record it in the PR (see research R5 risk).

## Expected automated coverage

`priceLevel`, `periods`, `series` and `summary` unit tests; component tests for NowCard, PriceTimeline, UsageChart, OverviewPage, Header/menu visibility and ThemeProvider, using MSW.
