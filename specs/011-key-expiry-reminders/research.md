# Research: Remind Administrators Before Keys Expire

Phase 0 of [plan.md](plan.md). The Technical Context had no open questions. These are the decisions behind it.

## R1. Where the banner lives and who asks for the list

- **Decision**:
  - **Where:** `KeyReminderBanner` is in `features/admin`. `AppLayout` renders it between the header and `<Outlet />`,
    so it is on every page under the layout: Now, History, Heater, Locations and Admin.
  - **Who asks:** the banner reads `useAuth().roles` and calls `useKeyReminders(isAdmin)`, with `enabled: isAdmin`.
    Users who aren't administrators never send the request (FR-004, SC-003).
  - **Errors:** on an error (403, 404 on an older API, offline), the banner renders nothing (FR-005). `retry: false`,
    so a 404 isn't tried three times.
- **Rationale**: One place covers every page, the same way the header does. The role check is UX only (Principle V); the
  API refuses the list to anyone else anyway.
- **Alternatives**:
  - A banner only on the Admin pages: the reminder would be missed, which is the point of the feature.
  - A badge on the Admin menu item: too easy to overlook.

## R2. Wording and urgency

- **Decision**: The pure `reminderText(r)` builds the line from `kind`, `locationName`, `daysLeft` and `expired`:

  | Case           | Text                                          |
  | -------------- | --------------------------------------------- |
  | `daysLeft` > 1 | "The sensor key for Hytta expires in 12 days" |
  | 1              | "… expires tomorrow"                          |
  | 0              | "… expires today"                             |
  | −1             | "… expired yesterday"                         |
  | < −1           | "… expired 3 days ago"                        |
  - **The kind:** "sensor key" or "water heater key".
  - **Expired lines** add a second clause, "Readings are refused until it is replaced" for a sensor key, or "Heater data
    can't be read until it is replaced" for a water heater key. They are shown in the destructive colours.
  - **Lines still to come** use the muted warning style.
  - **The banner:** `role="region"`, with `aria-label="Keys that expire soon"` and an `AlertTriangle` icon.

- **Rationale**: FR-002. `daysLeft` comes from the API, so the banner, the API and the Admin page all count the same Oslo
  days (spec Edge Cases).
- **Alternatives**: Showing the date ("expires 02.12.2026") instead of days. That is harder to judge at a glance; the
  date is shown in the dialog.

## R3. How much the banner shows, and when it refreshes

- **Decision**:
  - **How much:** at most 3 lines, in the API's order (soonest first). With more, a fourth line, "and N more", links to
    Admin → Locations.
  - **Refresh:**
    - `refetchInterval` 1 hour, and `refetchOnWindowFocus` (TanStack's default)
    - invalidated by every change in R6.
- **Rationale**:
  - The phone-width edge case.
  - Keys change rarely, so an hourly refresh plus the invalidations is enough, and costs one request an hour per open
    administrator.
- **Alternatives**: Polling as often as the dashboard does. That is pointless for dates.

## R4. Opening a location from the banner

- **Decision**:
  - **The link:** each line is a `Link` to `/admin/locations?edit={locationId}&key=sensor|heater`.
  - **Opening:** `AdminLocationsPage` opens the dialog for `edit` once the list has loaded.
  - **Finding the key:** the dialog scrolls the section with `id="sensor-key"` or `id="water-heater"` into view, and
    moves focus to its heading. The ids are location-independent, because only one dialog is open at a time.
  - **Closing:** removes `edit` and `key` from the URL (`replace`), so the back button doesn't reopen the dialog.
  - **Unknown ids:** an `edit` id that isn't in the list is ignored.
- **Rationale**:
  - FR-003, SC-002: one tap to the place to act.
  - The URL holds only ids, never a key (FR-011).
  - It reuses the existing dialog instead of adding a page.
- **Alternatives**:
  - Opening the dialog from the banner on the current page: the dialog belongs to the Admin page and its data.
  - A dedicated key page: more surface for the same thing.

## R5. Replacing the sensor key safely

- **Decision**: `ReplaceSensorKeyDialog` has two steps in one dialog.
  - **Step 1, confirm:** the warning, then "Replace key" and "Cancel".
  - **Step 2, the new key:** shown with `SensorKeyNotice`, which has the copy button and the "shown only once" warning,
    and a "Done" button.
  - **Holding the key:**
    - The key is the `useRotateSensorKey` mutation's `data`, with `gcTime: 0`.
    - The dialog calls `mutation.reset()` when it closes, so the key is gone from memory with the dialog. It is never
      put in the query cache, `localStorage` or a URL, and never logged.
  - **On success:** the mutation invalidates the Admin locations and the reminders, so the new hint and expiry show
    when the dialog closes.
  - **On an error:** the message is shown in step 1, and the old key still works, because the API didn't change it.
- **Rationale**:
  - FR-009, FR-011, SC-005.
  - It mirrors how the heater key mutation already keeps its secret out of the cache (spec 009, R6).
  - `SensorKeyNotice` is the locations slice's public component, so the warning text is the same everywhere.
- **Alternatives**:
  - Showing the new key in a toast: it would be lost too easily.
  - Showing it inline in the location dialog: it would mix with the form, and stay visible while editing.

## R6. What refreshes what

- **Decision**:

  | Change                                              | Invalidates                                                |
  | --------------------------------------------------- | ---------------------------------------------------------- |
  | Change the heater date                              | `['admin','water-heater',id]`, `['admin','key-reminders']` |
  | Connect or replace the heater (existing)            | also `['admin','key-reminders']`                           |
  | Remove the heater (existing)                        | also `['admin','key-reminders']`                           |
  | Rotate the sensor key                               | `['admin','locations']`, `['admin','key-reminders']`       |
  | Edit a location (existing, which can change active) | also `['admin','key-reminders']`                           |

- **Rationale**: FR-010. An inactive location's keys leave the list, so the active switch also counts.
- **Alternatives**: Waiting for the hourly refresh. The banner would then contradict what was just done.

## R7. The date field and its rule

- **Decision**:
  - **The field:** a native date input, shadcn `Input type="date"`, with `min` = tomorrow and `max` = today + 5 years,
    as hints for the browser's picker.
  - **The value:** `yyyy-MM-dd`, which is what the API takes.
  - **The rule, in the Zod schemas, commented as mirroring API spec 015 FR-003:**
    - required
    - a real date
    - `> osloToday()` and `≤ osloToday() + 5 years`, compared as `yyyy-MM-dd` strings, which sort as dates.
  - **The default:** today + 1 year in Oslo.
  - **Messages:** "The key must be valid after today" and "At most five years ahead".
  - **An API refusal** (`WaterHeater.KeyExpiryOutOfRange`, for example when the clock has just passed midnight) is put
    on the date field with `setError`, as the dialog already does for its other fields.
  - **Display:** "Key valid until 19.11.2027", using `formatOsloDate` on the date at Oslo noon, which avoids a
    time-zone shift.
- **Rationale**:
  - Principle IV: mistakes are caught before the request, and the API stays the authority.
  - The native picker works well on phones and needs no library.
- **Alternatives**: A text field `dd.mm.yyyy`. That needs parsing, and is easy to get wrong.
