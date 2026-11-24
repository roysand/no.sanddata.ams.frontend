# UI Contract: The Car Charger's State Right Now

## Car tab: the state tile (top, region "Charger now", title "Charger now")

Picture first, then the heading in bold, the details joined by " · ", then the age in small muted text.

| `state`          | Heading                 | Details (when the field is set)                                                                   | Picture    |
| ---------------- | ----------------------- | ------------------------------------------------------------------------------------------------- | ---------- |
| `charging`       | Charging                | `4,4 kW charging speed` · `13,0 kWh this charge` · `charging since 16:37` · `plugged in at 15:52` | `charging` |
| `connected`      | Connected, not charging | `13,0 kWh this charge` · `plugged in at 15:52`                                                    | `plugged`  |
| `finished`       | Finished charging       | `24,6 kWh this charge` · `plugged in at 15:52`                                                    | `plugged`  |
| `noCar`          | No car connected        | –                                                                                                 | `noCar`    |
| `offline`        | Offline                 | `last reported 14:10`                                                                             | `faded`    |
| `unknown`        | Status unknown          | `13,0 kWh this charge`                                                                            | `faded`    |
| error ≠ 404      | –                       | "The charger's state is unavailable right now."                                                   | `faded`    |
| 404, `noCharger` | the tile is not shown   |                                                                                                   |            |

- Age: "updated just now", "updated 2 minutes ago" (from `readAt`, moving on every 30 s).
- Times: "16:37" for today (Oslo), "23.11. 23:10" for an earlier day.
- While loading: a skeleton of the tile.

### The picture's screen reader text

| Mode       | Text                                         |
| ---------- | -------------------------------------------- |
| `charging` | A car charging from the charger              |
| `plugged`  | A car connected to the charger, not charging |
| `noCar`    | The charger with no car connected            |
| `faded`    | The car charger, state not known             |

## Car tab: the hint (in "Charging")

"Finished charges show here about 15 minutes after they end. The charger's state right now is at the top."

## Now page: the "Car charging" tile (added 2026-11-25, FR-013)

Below "Last 3 hours", above "What Norgespris has saved"; region and title "Car charging". Only for `state ===
'charging'`. No state heading (the title says it). The drawing, cropped and small, on the left; beside it:

```text
4,5 kW charging speed
26,5 kWh this charge
charging since 16:37 · plugged in at 15:52
updated 1 minute ago
```

The third line wraps only between its parts on a phone. On both tiles the power reads "{kW} charging speed".
