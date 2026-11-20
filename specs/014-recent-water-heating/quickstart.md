# Quickstart: Water Heating in the "Last 3 Hours" Chart

How to check that spec 014 works.

## Prerequisites

- The API with its spec 017 deployed (done 2026-11-20), and Hjemme with a water heater being sampled.
- `npm install`, then `npm run dev` with the `/api` proxy.

## Automated

```sh
npm test         # series.test.ts (window, bucketKw, heater matching, kWh), RecentUsage.test.tsx
npm run build
npm run lint
```

## Manual

1. **Steps on the clock (US2).** Open Now at a time such as 20:37.
   - The chart's labels are on whole 5 minutes.
   - The totals and "vs yesterday" look as before.
2. **Water heating (US1).** While the heater is heating (the Heater tab says "Heating · 2,0 kW"):
   - An orange area about 2 kW high sits under the blue line for those minutes.
   - Select such a point: "· Water heating 2,0 kW · Everything else …".
   - Select a step before the heating: only standby, or no water heating at all.
3. **The share (US3).** The card reads "Water heating: … kWh of … kWh (… %)". Compare it with the Heater tab's
   "Today" for a 3-hour stretch that is all inside today: it is the same or less.
4. **Without a heater.** Open a location without one:
   - There is no orange area, no legend entry and no share line.
   - No request to `/water-heater/power` shows in the network tab.
5. **Failure.** Block `/water-heater/power` in the browser's dev tools and reload:
   - The card shows the house's power and totals as normal.
   - "Water heating could not be loaded." appears under the legend.
