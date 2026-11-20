# Data Model: Remind Administrators Before Keys Expire

Phase 1 of [plan.md](plan.md). The API fields are in [contracts/api.md](contracts/api.md), and the decisions in
[research.md](research.md).

Nothing is stored in the browser. Everything comes from the API.

## Types (`features/admin/types.ts`)

```ts
type KeyKind = 'SensorKey' | 'WaterHeaterKey'

interface KeyReminder {
  locationId: string
  locationName: string
  kind: KeyKind
  /** yyyy-MM-dd, the last valid Oslo day. */
  expiresOn: string
  /** UTC ISO, sensor keys only; null for a water heater key. */
  expiresAt: string | null
  /** expiresOn − today: 0 is the last day, negative means expired. */
  daysLeft: number
  expired: boolean
}

interface KeyReminders {
  /** yyyy-MM-dd in Oslo. */
  today: string
  windowDays: number
  items: KeyReminder[]
}

/** The answer of rotate. `apiKey` is shown once and never stored. */
interface RotatedKey {
  apiKey: string
  hint: string
  expiresAt: string
}
```

- **`WaterHeaterSettings`** gains `keyExpiresOn: string` (`yyyy-MM-dd`). It may be absent from an API older than spec
  015; `api.ts` reads it as `keyExpiresOn ?? null`, so the type is `string | null`.
- **`WaterHeaterInput`** gains `keyExpiresOn: string`.

## Derived (`features/admin/keyReminders.ts`, pure)

| Function                          | Rule                                                                                                                                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `reminderText(r)`                 | The line text of research R2, from `kind`, `locationName`, `daysLeft` and `expired`                                                                                                  |
| `expiredConsequence(kind)`        | "Readings are refused until it is replaced" or "Heater data can't be read until it is replaced"                                                                                      |
| `expiryBadge(daysLeft)`           | `null` when > 30; "expires today", "expires tomorrow" or "expires in N days" for 0–30; "expired" when < 0                                                                            |
| `daysUntil(dateOrInstant, today)` | The days for the Admin dialog's badges. Sensor key: the Oslo date of `expiresAt` − 1 ms. Heater: `keyExpiresOn`. Both are counted from `osloToday()`, with the same rule as the API. |

The banner never computes days; it uses `daysLeft` from the API. Only the dialog's badges use `daysUntil`, because the
location list gives the sensor key's instant and the heater settings give the heater's date, without days.

## Form values (`features/admin/schema.ts`)

| Schema              | Field          | Rule                                                                                                                                                    |
| ------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `waterHeaterSchema` | `keyExpiresOn` | Required; `yyyy-MM-dd`; a real date; `> osloToday()`; `≤ osloToday() + 5 years`. It mirrors API spec 015 FR-003. The default is `osloToday() + 1 year`. |
| `keyExpirySchema`   | `keyExpiresOn` | The same rule                                                                                                                                           |

## Query keys

| Key                           | Hook                              | Options                                           |
| ----------------------------- | --------------------------------- | ------------------------------------------------- |
| `['admin','key-reminders']`   | `useKeyReminders(enabled)`        | `enabled`, `retry: false`, `refetchInterval: 1 h` |
| `['admin','water-heater',id]` | existing `useWaterHeaterSettings` | unchanged                                         |
| `['admin','locations']`       | existing `useAdminLocations`      | unchanged                                         |
