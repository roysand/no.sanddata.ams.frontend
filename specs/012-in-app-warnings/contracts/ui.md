# Contract: What the Warnings Show

All numbers are nb-NO, with kW shown to one decimal.

## Where

- **The banner:** a region labelled "Warnings for {location name}", at the top of every page under the layout, for the
  selected location.
- **Order:** it comes before the key reminders, in the same area. The lines go capacity, then usage, then Norgespris.
- **Links:** each line is a link to `/` (Now).
- **When nothing is shown:** with no warning, or with no selected location.

## Lines

| Warning    | Case                     | Text                                                                                                                               |
| ---------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Capacity   | The limit is still ahead | **This hour may lift the capacity step above 10 kW.** Stay under 4,2 kW for the rest of the hour.                                  |
| Capacity   | Already past the limit   | **This hour has lifted the capacity step above 10 kW.**                                                                            |
| Usage      | Usual > 0                | Hytta uses 3,8 kW now, about 4× the usual 0,9 kW for a Saturday at this hour.                                                      |
| Usage      | Usual 0                  | Hytta uses 1,2 kW now, against the usual 0,0 kW for a Saturday at this hour.                                                       |
| Norgespris | Projected over           | Hytta is expected to use 1 240 kWh this month, above the Norgespris limit of 1 000 kWh. The kWh above it are priced at spot price. |
| Norgespris | Already passed           | **Hytta has passed the Norgespris limit of 1 000 kWh this month.** The rest of the month is priced at spot price.                  |

- **Capacity lines** use the destructive colours.
- **Usage lines** use the muted warning style, as for key reminders that aren't expired.
- **Norgespris lines** use the muted warning style while projected, and the destructive colours once passed.
- **kWh** are whole numbers with a space as the thousands separator (nb-NO), for example "1 240 kWh".

## Not shown

The banner shows no warning in any of these cases:

- the figures can't be loaded
- the first 10 minutes of an hour (capacity)
- the top step, or no steps set (capacity)
- fewer than 3 of the last 4 weeks with readings for this hour and weekday (usage)
- a newest reading more than 6 minutes old (usage)
- a spot-price location, no projection yet, or a projection within the limit (Norgespris).

It never shows an error message.
