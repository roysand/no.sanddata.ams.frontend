# Research: A High Demand Switch on the Heater Tab

## R1 – The requests

- **Decision**: `setHighDemand(locationId, on)` → `api.put` (on) or `api.delete` (off) to
  `/api/admin/locations/{id}/water-heater/high-demand`, typed `{ locationId, highDemand, state: WaterHeaterState | null }`.

## R2 – The mutation and the cache

- **Decision**: `useHighDemand(locationId)`: `useMutation` with `retry: 0` (TanStack's default for mutations, stated
  for clarity). On success, a non-null `state` is written with `setQueryData(['water-heater', 'state', locationId])`;
  a null `state` invalidates that key. On a 503 (`WaterHeater.Unavailable`) the key is invalidated too, since the
  outcome is unknown.
- **Rationale**: the handover asks to show the answer at once and never retry; the answer is keyed to the location the
  switch was made for, so switching location meanwhile can't mix them up.

## R3 – The switch and who sees it

- **Decision**: `HighDemandSwitch({ locationId, state })` inside the heater card, under the status line, shown when
  `useAuth().roles.includes('Admin')`. `checked` = the mutation's value while pending, otherwise
  `state.specialMode.mode === 'Supercharge'`. Disabled while pending, while the heater is offline, and after
  `HighDemandNotOffered`. Labelled "High Demand", described by "Heats the tank extra for 24 hours."; while pending
  "Switching…" (`role="status"`).
- **Rationale**: the same "show the value being sent" pattern as the car checkbox (spec 013).

## R4 – Failures

- **Decision** (codes from the API contract):
  - 503 `WaterHeater.Unavailable`: "Couldn't reach the heater. It may or may not have switched; the state below is
    read again."
  - 502 `WaterHeater.HighDemandNotOffered`: "OSO no longer offers High Demand." and the switch stays disabled.
  - 502 `WaterHeater.Rejected` / `KeyUnreadable`: "The heater's OSO key must be reconnected under Admin → Locations."
  - Anything else: the API's message.
  - The message clears on the next switch.

## R5 – The name

- **Decision**: `MODE_LABEL.Supercharge` becomes "High Demand", so the badge and "High Demand until …" match the
  switch and the OSO app.
