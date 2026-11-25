# Research: A Usage Chart for the Car, on the Car Tab

## R1 – One component, two measures

- **Decision**: `UsageChart({ locationId, large, measure = 'house' })`. With `'car'`: the title "Car usage", no
  kWh/NOK switch (the unit is kWh), the main colour `--ev-charger` instead of `--usage` for the line, area, bars and
  legend, no heater or car split, the group's name "Car charging, …", the empty texts of contracts/ui.md, and the
  period stored under `ams.car-chart`.
- **Rationale**: Roy asked for "the same" tile; one component keeps the two from drifting apart (stepping, the
  comparison, keyboard use, the tap-for-details line).
- **Alternatives**: copy the 600-line component (two places to fix every later change).

## R2 – The car's own kWh in the rows

- **Decision**: `UsageRow` gains `carOwnKwh` = the car part's kWh whatever `included` says (`carKwh` stays as today:
  only when counted, for Now's split). `carUsageRows(rows)` turns house rows into car rows: `kwh = carOwnKwh ?? 0`,
  no NOK, no parts; and returns `[]` when no row has any car kWh, so the chart says "no charging" instead of drawing
  zeros (FR-006).
- **Rationale**: the car's part is on every hourly and daily item (spec 013), counted or not; using it keeps the
  chart's totals equal to "Today" and "This month" (FR-004), which read the same parts.

## R3 – Data and stepping

- **Decision**: the car chart calls `usePeriodData` as Now does, so the two share the cache; the rows are mapped in the
  component. Stepping back stops, as on Now, where neither the period nor the one before has any (car) values.

## R4 – Removing the session list

- **Decision**: remove `SessionsCard`, `useEvChargerSessions`, `getEvChargerSessions`, `EvChargerSession`,
  `sessionTimes` and `formatDuration` (used only by the list) and their tests. The note in "Charging" becomes "A
  finished charge shows here and in the chart below about 15 minutes after it ends. The charger's state right now is
  at the top."
