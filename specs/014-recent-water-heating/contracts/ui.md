# UI Contract: Water Heating in the "Last 3 Hours" Card

## Chart

- **Steps:** 36 steps of 5 minutes, on whole 5 minutes in Oslo time. The axis labels are the steps' start times
  (17:40, 18:10, …).
- **Water heating:**
  - An area from 0 up to `min(heater, house)`, in `var(--water-heater)` at 50 % opacity.
  - It is drawn under the house's blue area and line.
  - A step without a heater value leaves a gap.
- **Yesterday:** the dashed line is unchanged.

## Legend (under the chart)

- "Last 3 hours" · "Water heating" (only with heater values) · "Yesterday" (as today) · "kW, average per 5 minutes".
- **Error note:** when the heater figures failed, a muted "Water heating could not be loaded." follows the legend.

## Detail line (the selected point)

- **With a heater value:** "19:40 · 7,4 kW · Water heating 2,0 kW · Everything else 5,4 kW · yesterday 6,1 kW".
  - When the step is partly measured: "· Water heating 2,0 kW (partly measured) · …".
- **Without one:** as today, "19:40 · 7,4 kW · yesterday 6,1 kW". Never "Water heating 0 kW".

## Totals (under "Yesterday, same 3 hours: …")

- "Water heating: 3,1 kWh of 21,17 kWh (15 %)".
  - With no house kWh, the share is left out: "Water heating: 0,2 kWh".
  - Not shown without heater values.
