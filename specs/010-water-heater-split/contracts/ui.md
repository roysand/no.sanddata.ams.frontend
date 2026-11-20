# Contract: What Each Place Shows

All numbers are nb-NO formatted, with a decimal comma. Water heating values appear only where the part is not `null`.

## Usage chart (Now and History)

| Element                     | With a heater part                                                                                                                | Without   |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------- |
| Bar (week, month and year)  | Two stacked segments: water heating at the bottom (`--water-heater`), everything else on top (`--usage`). The label is the total. | As today  |
| Day view                    | A filled water heating area under the existing total area                                                                         | As today  |
| Previous period             | Unchanged, a single total                                                                                                         | Unchanged |
| Legend                      | Adds "Water heating" when any slot in the current period has a part                                                               | As today  |
| Detail line                 | `{label} · {total} · Water heating {x}[ (partly measured)] · Everything else {y}`, then the previous-period text as today         | As today  |
| kr with unknown heater cost | Total only, no split, and the detail line says nothing about water heating                                                        | n/a       |

The chart's `aria-label` is unchanged. The detail line stays `aria-live="polite"`, so the split is read aloud with
the value.

## Bill (History `BillCard`, Now `ExpectedBillCard`)

Below the total, in small muted text, with no amount column:

| Case                                              | Text                                                                                                                       |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| A Final month with heater data from its first day | `Water heating in November 2026: 104,6 kWh · 94,12 kr`                                                                     |
| Heater data starts later                          | `Water heating since 19.11.2026: 104,6 kWh · 94,12 kr`                                                                     |
| An Estimate month                                 | `Water heating so far this month: 104,6 kWh · 94,12 kr` (or `since …`), then: `Measured so far, not part of the estimate.` |
| Cost unknown                                      | The ` · {kr}` part is left out                                                                                             |
| No part                                           | No line                                                                                                                    |

## Heater tab (`WaterHeaterEnergyCard`, below the live card)

The card is titled "Energy".

| Row        | With data                                                                    | Without               |
| ---------- | ---------------------------------------------------------------------------- | --------------------- |
| Today      | `4,2 kWh · 3,80 kr · 31 % of today's use`                                    | `No measurements yet` |
| This month | `104,6 kWh · 94,12 kr`, with `since 19.11.2026` when it starts after the 1st | `No measurements yet` |

If today's total kWh is 0, the share is left out. If a cost is unknown, the kr is left out.

## CSV (History, Export)

Five columns are appended to both the hourly and the daily file, in this order:

`Water heating (kWh);Water heating cost (kr);Everything else (kWh);Everything else cost (kr);Water heating sampled minutes`

- **Number style:** kWh with 3 decimals, kr with 2, and minutes as an integer, all with a decimal comma.
- **Empty cells:** all five are empty when the row has no part, and the two cost cells are empty when the cost is
  unknown.
- **Header:** always present, also for a location without a heater.
