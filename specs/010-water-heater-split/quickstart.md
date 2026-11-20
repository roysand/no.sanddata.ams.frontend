# Quickstart: Check the Water Heating Split

## Prerequisites

- Node 22+ and `npm install`.
- For the manual checks: the API with spec 012 deployed, or running locally, reached through the Vite `/api` proxy.
  Use Hjemme, which has heater samples from 2026-11-19 onwards, and a location without a heater.

## 1. Automated checks

```sh
npm run build && npm run lint && npm test
```

Expected: everything passes. The new tests cover:

- **`waterHeater.test.ts`:** `restOf`, `sumParts`, `isPartlyMeasured` (including a 23- and a 25-hour day), and
  `shareOf`.
- **`series.test.ts`:**
  - heater, rest and partly on the points
  - the year view's month sums
  - `hasHeater`
  - kr with an unknown heater cost
- **`UsageChart.test.tsx`:**
  - the detail line text with and without a part
  - the legend entry only with a part
  - "partly measured"
  - a fixture without `waterHeater` rendering as before
- **`BillCard.test.tsx` and `ExpectedBillCard.test.tsx`:** the note's texts from [contracts/ui.md](contracts/ui.md),
  no note without a part, and the total unchanged.
- **`WaterHeaterPage.test.tsx`:**
  - today and month rows
  - "No measurements yet"
  - the share
  - no extra request when the hourly-today and bill data are already cached
- **`exportCsv.test.ts`:** the five headers, filled cells, empty cells without a part, and empty cost cells with an
  unknown cost.

## 2. In the browser (manual)

1. `npm run dev`, then sign in and select Hjemme.
2. **Now → usage chart, day view in kWh:** hours with heating show the warm area under the line. Tap an hour where the
   heater ran: the detail line shows water heating and everything else, and they add up to the total.
3. **Switch to kr:** the same hour shows costs that add up to the hour's cost.
4. **Week, month and year:** stacked bars, with the label still the total and the previous-period bar unchanged.
5. **Days before 2026-11-19:** no split and no "Water heating 0".
6. **The expected bill on Now:** the water heating line below the total, with "Measured so far, not part of the
   estimate."
7. **History → bill for November:** "Water heating since 19.11.2026: …".
8. **Heater tab:** today's and this month's figures. The month equals the bill line, and today equals the sum of the
   day chart's hours. Switching from Now to Heater shows the figures at once from the cache; TanStack Query then
   refreshes them in the background, as every page in the app does on mount. A location without a heater makes no
   hourly or bill request from the tab.
9. **History → export, hourly for 20 November:** open it in Numbers or Excel. On each row, water heating + everything
   else = usage, and the same for cost.
10. **A location without a heater:** the chart, the bill and History look exactly as on `main`. The CSV has the five
    columns, empty.
11. **375 px wide, light and dark:** the bar segments can be told apart, the legend wraps, and the bill line and the
    Heater card don't overflow.
