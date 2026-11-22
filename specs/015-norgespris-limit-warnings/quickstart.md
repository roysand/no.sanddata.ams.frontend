# Quickstart: Norgespris Limit Warnings for Every Location

How to check that spec 015 works.

## Prerequisites

- The API with its spec 018 deployed (`GET /api/electricity-cost/norgespris-status`, `spotEnergyPricePerKwh` on
  `/prices`).
- Roy's user, with Hjemme (home, 5 000 kWh) and the cabin (holiday home, 1 000 kWh), both on Norgespris.
- `npm install`, then `npm run dev` with the `/api` proxy.

## Automated

```sh
npm test         # norgesPris.test.ts, WarningBanner.test.tsx, api.test.ts
npm run build
npm run lint
```

## Manual

1. **Every location (US4).** Select Hjemme. In the network tab, `norgespris-status` is read once, and again after
   5 minutes. Compare each item with the location's expected bill on Now: kWh so far and projection agree, whole kWh
   (SC-003).
2. **Over the limit (US1).** If the cabin is over its limit this month: with Hjemme selected, the banner shows the
   cabin's urgent line on Now, History and Heater, with the reset date. It has no close button. Tap it: the cabin is
   selected and Now shows its bill.
   - If no location is over: check this in the tests, or with a location whose limit an Admin has set low for a test.
3. **Approaching (US2).** For a location at 90 % or more: the line gives kWh so far, the limit, and the days left or
   the expected end. Below 90 % and projected over: spec 012's wording.
4. **Expensive hours (US3).** After ~13:00, for a location over or projected over its limit: the expensive-hours line
   matches tomorrow's hours on the price chart where spot energy is ≥ 4 × Norgespris (SC-004). For a location within
   its limit: no line, and no request for tomorrow's prices for it.
5. **The car.** Tick "Count the car charger with the house" at a location with a charger: within seconds the status is
   read again, and its kWh so far grow by the car's kWh this month. Untick it to go back.
6. **Failure (US4).** Block `norgespris-status` in the dev tools and reload: no Norgespris lines, no error, the capacity
   and usage lines still work.
7. **Phone.** At 375 px in light and dark mode, each line takes at most two lines (SC-005).
