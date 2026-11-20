# Tasks: Remind Administrators Before Keys Expire

**Input**: Design documents from `/specs/011-key-expiry-reminders/`

**Prerequisites**:

- [plan.md](plan.md) and [spec.md](spec.md)
- [research.md](research.md), with decisions R1 to R7
- [data-model.md](data-model.md)
- [contracts/api.md](contracts/api.md) and [contracts/ui.md](contracts/ui.md), which give the exact texts
- [quickstart.md](quickstart.md)

**Tests**: Included. The constitution (VII) and quickstart §1 ask for them. They use Vitest, Testing Library and MSW,
with a fresh `QueryClient` per test, asserting roles, labels and text.

**Organization**:

- Phase 2 holds the types, the API calls and the pure text module that every story uses.
- Then one phase per story: US1 the banner, US2 the heater key's date, US3 the sensor key. All three are P1.
- US1 needs only Phase 2. US2 and US3 are independent of each other.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1–US3 from spec.md

## Facts from the code that the tasks rely on

- **Admin API (`src/features/admin/api.ts`):**
  - `waterHeaterPath(id)` gives `/api/admin/locations/{id}/water-heater`.
  - `getWaterHeaterSettings` returns `null` on 404.
  - `connectWaterHeater(id, input)` sends `{ subscriptionKey, deviceId }`.
  - `getAdminLocations()` exists.
- **Admin hooks (`src/features/admin/hooks.ts`):**
  - `ADMIN_LOCATIONS_KEY = ['admin','locations']`
  - `useUpdateLocationAsAdmin` (line ~99)
  - `useWaterHeaterSettings(id)` (~223)
  - `useWaterHeaterActions(id)` (~234) with a `refresh()` that invalidates `['admin','water-heater',id]` and
    `['water-heater','state',id]` (and `['locations']` since PR #39); `connect` has `gcTime: 0`.
- **Types:**
  - `src/features/admin/types.ts` has `WaterHeaterSettings { locationId, deviceIdHint, connectedAt, updatedAt }` and
    `WaterHeaterInput { deviceId, subscriptionKey }`.
  - `ApiKeyInfo { description, hint, isActive, expiresAt, status }` is in `src/features/locations/types.ts`, as
    `AdminLocation.apiKey`.
- **Schema:** `waterHeaterSchema` in `src/features/admin/schema.ts` (~line 265), with `deviceId` and `subscriptionKey`.
- **Components:**
  - `ConnectWaterHeaterDialog.tsx` is a React Hook Form dialog. It puts API field errors on fields with `setError`.
  - `WaterHeaterSection.tsx` shows "Connected", the hint and "connected {formatOsloDate}".
  - `AdminLocationDialog.tsx` renders `<WaterHeaterSection>`, then
    `<p>Sensor key …{hint} · {status}</p>` (~line 95).
  - `AdminLocationsPage.tsx` opens the dialog with `const [editingId, setEditingId] = useState<string | null>(null)`
    (~line 30).
- **Shared pieces:**
  - `SensorKeyNotice({ apiKey })` is exported from `src/features/locations/index.ts`.
  - `formatOsloDate(isoUtc)` is exported from `src/features/dashboard/index.ts`, and gives `dd.mm.yyyy`.
  - `osloDayKey` in `features/dashboard/format.ts` is not exported (en-CA, which gives `yyyy-MM-dd`).
- **Layout and auth:**
  - `src/components/AppLayout.tsx` renders `<Header />`, then `<main><Outlet /></main>`, then `<TabBar>`.
    `AppLayout.test.tsx` exists (PR #39), with an `AuthContext` and roles `['User']`.
  - `useAuth()` from `features/auth/useAuth` gives `roles`.
- **Tests:** MSW fails on unhandled requests (`onUnhandledRequest: 'error'`). Test files exist for `schema`,
  `WaterHeaterSection`, `AdminLocationsPage` and `AppLayout`.
- **API names** (API spec 015): `keyExpiresOn` (`yyyy-MM-dd`), `GET /api/admin/key-reminders`,
  `PUT …/water-heater/key-expiry`. Rotate answers `{ apiKey, hint, expiresAt }`.

---

## Phase 1: Setup

- [x] T001 Check the baseline on `011-key-expiry-reminders`: run `npm run build`, `npm run lint` and `npm test`, and
      note the test count. Use `npx prettier --check` on changed files only (with `xargs`), never `npm run format`.

---

## Phase 2: Foundational (blocks every story)

- [x] T002 [P] Add the Oslo "today" helper:
  - **`src/features/dashboard/format.ts`:** `export function osloToday(now = new Date()): string` returns `yyyy-MM-dd`
    in Oslo, reusing `osloDayKey`. Also add `export function addYearsToDate(date: string, years: number): string`,
    calendar arithmetic on `yyyy-MM-dd` (29 February becomes 28 February), for the defaults and limits.
  - **`src/features/dashboard/index.ts`:** export both.
  - **Tests in `format.test.ts`:**
    - `osloToday` at 2026-11-19T23:30Z is `2026-11-20`, and at 2026-11-19T22:30Z is `2026-11-19`.
    - `addYearsToDate('2028-02-29', 1)` is `2029-02-28`.
- [x] T003 [P] Add the types to `src/features/admin/types.ts` (data-model):
  - `KeyKind`, `KeyReminder` and `KeyReminders`
  - `RotatedKey { apiKey: string; hint: string; expiresAt: string }`
  - `WaterHeaterSettings` gains `keyExpiresOn: string | null`, which is null from an API older than spec 015.
  - `WaterHeaterInput` gains `keyExpiresOn: string`.
- [x] T004 Add the API calls in `src/features/admin/api.ts` (after T003):
  - **`getKeyReminders()`:** `api.get<KeyReminders>('/api/admin/key-reminders')`.
  - **`getWaterHeaterSettings`:** normalise the answer to `{ ...settings, keyExpiresOn: settings.keyExpiresOn ?? null }`.
  - **`connectWaterHeater`:** also send `keyExpiresOn: input.keyExpiresOn`.
  - **`setWaterHeaterKeyExpiry(id, keyExpiresOn)`:** `api.put<WaterHeaterSettings>(waterHeaterPath(id) +
'/key-expiry', { keyExpiresOn })`, normalised the same way.
  - **`rotateSensorKey(id)`:** `api.post<RotatedKey>('/api/admin/locations/' + id + '/api-key/rotate')`.
  - **Never log** a response or a key.
- [x] T005 [P] Create `src/features/admin/keyReminders.ts`, pure, with no React (data-model "Derived", research R2):
  - **`reminderText(r: KeyReminder): string`**, from the table in contracts/ui.md. The kind is "sensor key" or "water
    heater key":
    - "The {kind} for {name} expires in N days", "… expires tomorrow", "… expires today"
    - "… expired yesterday", "… expired N days ago"
  - **`expiredConsequence(kind)`:** "Readings are refused until it is replaced" or "Heater data can't be read until it
    is replaced".
  - **`expiryBadge(daysLeft: number): { text: string; urgent: boolean } | null`:**
    - `null` when daysLeft > 30
    - "expires today", "expires tomorrow" or "expires in N days" when 0–30, not urgent
    - "expired" when < 0, urgent
  - **`daysUntilDate(date: string, today: string): number`:** whole days between two `yyyy-MM-dd` values (UTC
    `Date.UTC` arithmetic).
  - **`sensorKeyLastDay(expiresAtIso: string): string`:** the Oslo date of `expiresAt − 1 ms`, the API's rule
    (research R3 of API spec 015). It uses `osloToday` from the dashboard index on `new Date(ms − 1)`.
- [x] T006 [P] Write `src/features/admin/keyReminders.test.ts` for T005:
  - **Texts:** 12, 1, 0, −1 and −3 days, for both kinds.
  - **Badges:** 31 → null; 30 → "expires in 30 days"; 1 → "expires tomorrow"; 0 → "expires today"; −1 → "expired",
    urgent.
  - **`daysUntilDate`:** across the end of summer time (`2026-10-10` → `2026-11-09` = 30) and across a year end.
  - **`sensorKeyLastDay`:** `2028-11-19T23:00:00Z` (Oslo midnight) → `2028-11-19`, and `2028-11-20T10:00:00Z` →
    `2028-11-20`.
- [x] T007 Add the hooks to `src/features/admin/hooks.ts` (after T004):
  - **`KEY_REMINDERS_KEY`:** `['admin','key-reminders']`.
  - **`useKeyReminders(enabled: boolean)`:** `useQuery` with `enabled`, `retry: false`, and
    `refetchInterval: 60 * 60 * 1000`.
  - **`useSetKeyExpiry(locationId)`:** its `onSuccess` invalidates `['admin','water-heater',locationId]` and
    `KEY_REMINDERS_KEY`.
  - **`useRotateSensorKey(locationId)`:** with `gcTime: 0`, as the key is in its `data`. Its `onSuccess` invalidates
    `ADMIN_LOCATIONS_KEY` and `KEY_REMINDERS_KEY`.
  - **Existing refreshes:** `useWaterHeaterActions`'s `refresh()` and `useUpdateLocationAsAdmin`'s `onSuccess` also
    invalidate `KEY_REMINDERS_KEY` (research R6).

**Checkpoint**: build, lint and tests pass, and the UI is unchanged.

---

## Phase 3: User Story 1, an administrator is reminded when a key expires soon (P1) 🎯 MVP

**Goal**: A banner on every page for administrators, with one linked line per due key (FR-001 to FR-005).

**Independent Test**: In the tests, an administrator with 2 due keys sees both lines, linking to
`/admin/locations?edit=…&key=…`. A user who isn't an administrator sees nothing, and no request is made.

### Tests for User Story 1

- [x] T008 [P] [US1] Create `src/features/admin/KeyReminderBanner.test.tsx`. Render the banner in a `MemoryRouter`
      with an `AuthContext`. MSW serves `GET */api/admin/key-reminders` and counts the requests. Check:
  - **An administrator:** lines in the API's order, each with the contracts/ui.md text, and each a link to
    `/admin/locations?edit={id}&key=sensor` or `&key=heater`.
  - **Expired lines:** they show the consequence text, and are marked urgent (a `data-urgent` attribute or a class you
    can query).
  - **Four keys:** 3 lines and "and 1 more", linking to `/admin/locations`.
  - **`items: []`:** nothing rendered; `queryByRole('region', { name: 'Keys that expire soon' })` is null.
  - **A 404 answer:** nothing rendered, no error text, and exactly one request (`retry: false`).
  - **Roles `['User']`:** nothing rendered, and the request count is 0.
- [x] T009 [P] [US1] Extend `src/components/AppLayout.test.tsx`:
  - An administrator with a due key sees the banner above the page content. Use the existing route setup, and add a
    `key-reminders` handler.
  - The existing tests, with roles `['User']`, still pass without a `key-reminders` handler. That shows no request is
    made: MSW fails on an unhandled one.

### Implementation for User Story 1

- [x] T010 [US1] Create `src/features/admin/KeyReminderBanner.tsx` (research R1–R3, contracts/ui.md):
  - **Data:** `const { roles } = useAuth()`, `isAdmin = roles.includes('Admin')`, and
    `const { data } = useKeyReminders(isAdmin)`.
  - **When to render nothing:** when the user isn't an administrator, there's no data, or `data.items.length === 0`.
    On an error there's no `data`, so nothing is rendered.
  - **The region:** `<section role="region" aria-label="Keys that expire soon">`, with an `AlertTriangle` icon and a
    list.
  - **Lines:** each of the first 3 items is a `<Link to={…}>` with `reminderText(r)`. If `r.expired`, it adds
    `expiredConsequence(r.kind)` and uses `text-destructive` with a `bg-destructive/10` row. Otherwise it is muted.
  - **More than 3:** a 4th line, `and {n} more`, linking to `/admin/locations`.
  - **Width:** it fits at 375 px, with no horizontal scroll.
- [x] T011 [US1] In `src/components/AppLayout.tsx`, render `<KeyReminderBanner />` between `<Header />` and
      `<main>`, inside the same `px-4` gutter, imported from `../features/admin/KeyReminderBanner` as `routes.tsx` imports
      admin pages.

**Checkpoint**: T008 and T009 pass, and the banner shows for administrators only.

---

## Phase 4: User Story 2, the water heater key's expiry date (P1)

**Goal**: The date is entered when connecting or replacing, shown with a badge in the heater section, and can be
changed alone (FR-006, FR-007, FR-010).

**Independent Test**: In the tests:

- the connect dialog sends `keyExpiresOn`, with one year from today as the default
- the section shows "Key valid until 19.11.2027"
- Change date sends `{ keyExpiresOn }` only
- the API's out-of-range error appears at the field.

### Tests for User Story 2

- [x] T012 [P] [US2] Extend `src/features/admin/schema.test.ts` with `keyExpiresOn` on `waterHeaterSchema` and on
      `keyExpirySchema`. Fix the clock with `vi.setSystemTime('2026-11-20T10:00:00Z')`.
  - **Refused:** `2026-11-20` (today), `2031-11-21` (more than 5 years), `2027-02-30` and `''`.
  - **Accepted:** `2026-11-21` and `2031-11-20` (exactly 5 years).
- [x] T013 [P] [US2] Extend `src/features/admin/WaterHeaterSection.test.tsx`:
  - **Connect:** the dialog's "Key valid until" is pre-filled with `osloToday() + 1 year`. Saving sends
    `{ subscriptionKey, deviceId, keyExpiresOn }`; capture the request body.
  - **The API refuses the date:** a `400` with the field error `WaterHeater.KeyExpiryOutOfRange`, or `errors` on
    `keyExpiresOn`, is shown at the date field.
  - **The section:** with settings `keyExpiresOn: '2027-11-19'` it shows "Key valid until 19.11.2027". With a date 10
    days ahead, it shows the badge "expires in 10 days".
  - **Change date:**
    - The dialog is pre-filled with the current date.
    - Saving `2027-12-01` sends `PUT …/water-heater/key-expiry` with exactly `{ keyExpiresOn: '2027-12-01' }`.
    - The settings are refetched.
  - **An older API:** settings without `keyExpiresOn` give no date line and no Change date button.

### Implementation for User Story 2

- [x] T014 [US2] Add the date rule in `src/features/admin/schema.ts` (research R7). The comment says it mirrors API spec
      015 FR-003.
  - **`keyExpiresOnField`:** a `z.string()` that is:
    - `/^\d{4}-\d{2}-\d{2}$/`, and a real date (it round-trips through `Date.UTC`)
    - `> osloToday()`, with the message "The key must be valid after today"
    - `<= addYearsToDate(osloToday(), 5)`, with the message "At most five years ahead".
  - **Evaluated when parsed,** so the clock is read at validation time.
  - **Schemas:** add the field to `waterHeaterSchema`, and export `keyExpirySchema = z.object({ keyExpiresOn:
keyExpiresOnField })` and its type.
- [x] T015 [US2] Add the date field to `src/features/admin/ConnectWaterHeaterDialog.tsx`:
  - **Field:** after the key field, "Key valid until", as `<Input type="date" min={tomorrow} max={5 years}>`. Its
    default is `addYearsToDate(osloToday(), 1)`.
  - **Hint:** "OSO keys are valid for one year. Check the date in the OSO portal."
  - **Sending:** pass `keyExpiresOn` to `connect.mutate`.
  - **API errors:** map an API error with the code `WaterHeater.KeyExpiryOutOfRange`, or a field error for
    `keyExpiresOn`, to `setError('keyExpiresOn', …)`.
- [x] T016 [P] [US2] Create `src/features/admin/ExpiryBadge.tsx`: `ExpiryBadge({ daysLeft })` renders `expiryBadge()`
      as a shadcn `Badge`. It uses the `destructive` variant when urgent, `outline` with warning text otherwise, and
      nothing when null.
- [x] T017 [US2] Create `src/features/admin/KeyExpiryDialog.tsx`:
  - **Props:** `{ location, current, open, onOpenChange }`.
  - **Form:** React Hook Form with `keyExpirySchema`. The title is "Water heater key for {name}". The one date field
    is "Key valid until", pre-filled with `current`. The footer has "Cancel" and "Save date" (dialog layout rule: one
    footer with a named save).
  - **Saving:** it calls `useSetKeyExpiry(location.id)`. The API's range error goes to the field. It closes on success.
- [x] T018 [US2] Extend `src/features/admin/WaterHeaterSection.tsx` (after T016 and T017):
  - **The date line:** when `heater.keyExpiresOn`, under "connected …", show `Key valid until
{formatOsloDate(heater.keyExpiresOn + 'T12:00:00Z')}`, then
    `<ExpiryBadge daysLeft={daysUntilDate(heater.keyExpiresOn, osloToday())} />`, then a small outline "Change date"
    button that opens `KeyExpiryDialog`.
  - **The section id:** wrap the section in `id="water-heater"` for the banner's link (R4).

**Checkpoint**: T012 and T013 pass.

---

## Phase 5: User Story 3, the sensor key's expiry and Replace sensor key (P1)

**Goal**: The sensor key shows its expiry with a badge. Replace sensor key confirms, then shows the new key once
(FR-008 to FR-011).

**Independent Test**: In the tests, the section shows "expires 02.12.2026" with a badge. Replace asks first, then shows
the new key with Copy key. After Done the key is gone, and the locations and reminders are refetched.

### Tests for User Story 3

- [x] T019 [P] [US3] Create `src/features/admin/SensorKeySection.test.tsx`. Render it with an `AdminLocation` fixture
      with `apiKey { hint: 'a1b2', status: 'Active', expiresAt: '2026-12-02T09:14:03Z' }`, and fix the clock to
      2026-11-20.
  - **The line:** `…a1b2 · Active · expires 02.12.2026`, with the badge "expires in 12 days".
  - **Far ahead:** with `expiresAt` 2 years ahead, there is no badge.
  - **Step 1:** Replace sensor key shows the confirmation text from contracts/ui.md. Cancel makes no request.
  - **Confirming:** `POST */api/admin/locations/{id}/api-key/rotate` answers
    `{ apiKey: 'NEWKEY-123', hint: 'z9y8', expiresAt: '2028-11-20T10:00:00Z' }`.
    - The dialog shows "New sensor key for {name}", the key text, the **Copy key** button and "Valid until 20.11.2028".
    - `GET */api/admin/locations` and `GET */api/admin/key-reminders` are requested again.
  - **Done:** the key text `NEWKEY-123` is no longer in the document, and `localStorage` doesn't contain it.
  - **A `500` from rotate:** the error is shown in step 1, and no key is shown.
- [x] T020 [P] [US3] Extend `src/features/admin/AdminLocationsPage.test.tsx`:
  - **Opening from the banner's link:** render at `/admin/locations?edit={id}&key=sensor`. Once the list loads, that
    location's dialog is open.
  - **Closing:** the URL search is empty again. Check the location with a `useLocation` probe, or with `MemoryRouter`
    and a route that renders the search.
  - **An unknown `edit` id:** it is ignored, and no dialog opens.

### Implementation for User Story 3

- [x] T021 [US3] Create `src/features/admin/ReplaceSensorKeyDialog.tsx` (research R5):
  - **Props:** `{ location, open, onOpenChange }`. It holds `const rotate = useRotateSensorKey(location.id)`.
  - **Step 1** (no `rotate.data`):
    - the title "Replace the sensor key for {name}?"
    - the warning text
    - the error, if any (`role="alert"`)
    - the footer, with "Cancel" and "Replace key", which shows "Replacing…" while pending.
  - **Step 2** (`rotate.data`):
    - the title "New sensor key for {name}"
    - `<SensorKeyNotice apiKey={rotate.data.apiKey} />`, imported from `../locations`
    - "Valid until {formatOsloDate(rotate.data.expiresAt)}"
    - the footer, with "Done".
  - **Closing:** `onOpenChange(false)` always calls `rotate.reset()` first. It ignores closing while pending.
  - **Never** log the key, or put it in state outside the mutation.
- [x] T022 [US3] Create `src/features/admin/SensorKeySection.tsx`, with `id="sensor-key"`:
  - a "Sensor key" heading (`h3`, `tabIndex={-1}` for focus from the link)
  - the line `…{hint} · {status} · expires {formatOsloDate(apiKey.expiresAt)}`
  - `<ExpiryBadge daysLeft={daysUntilDate(sensorKeyLastDay(apiKey.expiresAt), osloToday())} />`, shown only when the
    key is active (`apiKey.isActive`)
  - an outline "Replace sensor key" button that opens `ReplaceSensorKeyDialog`.
- [x] T023 [US3] In `src/features/admin/AdminLocationDialog.tsx`, replace the `<p>Sensor key …</p>` line (~95) with
      `<SensorKeySection location={location} />`. Accept a new prop, `focusKey?: 'sensor' | 'heater'`. On open, a
      `useEffect` scrolls the section with that id into view and focuses its heading.
- [x] T024 [US3] In `src/features/admin/AdminLocationsPage.tsx`, open from the link (research R4):
  - read `useSearchParams()`
  - once `locations.data` has loaded, if `edit` is in the list, call `setEditingId(edit)` and pass `focusKey`
  - when the dialog closes, `setSearchParams({}, { replace: true })`
  - ignore an unknown id.

**Checkpoint**: T019 and T020 pass, and the banner's link opens the right dialog at the right key.

---

## Phase 6: Polish and checks

- [x] T025 Run `npm run build`, `npm run lint` and `npm test`, and `npx prettier --check` on the changed files with
      `xargs`. The test count is T001's plus the new tests. Lint shows no new warnings; there are 4 on `main`.
- [x] T026 Review the diff for the rules:
  - no `any` and no unjustified `as`
  - no key in `localStorage`, a URL, a log or the query cache: rotate's `gcTime: 0` and `reset()`
  - `useKeyReminders` is disabled for users who aren't administrators
  - the date rule is commented as mirroring the API.
- [x] T027 [P] Update `backlog.md`: the "Sensor key rotation" entry now says the button exists, from spec 011. If PR
      **Done 2026-11-20, in part:** the spec's status line is set. `backlog.md` was left alone, because the open PR #40
      rewrites the same "Sensor key rotation" entry. After both are merged, add to it that the Admin button exists (spec
      011), and that owners rotating their own key and a warning before expiry remain open.
      #40 isn't merged yet, note the conflict to resolve. Also set the spec's status line.
- [ ] T028 Manual: quickstart §2, steps 1–7, against the deployed API with spec 015:
  - Hjemme's date is 19.11.2027, and there is no banner.
  - Set the date to 10 days ahead: the banner shows; follow the link; set it back.
  - A user who isn't an administrator sees no banner.
  - Replace the key of a **test** location only.
  - 375 px width, in light and dark mode.

---

## Dependencies and execution order

- **Phase 1 → Phase 2 → (US1 ∥ US2 ∥ US3) → Phase 6.**
- **Phase 2:** T002, T003, T005 and T006 run in parallel. T004 needs T003. T007 needs T004.
- **US1:** T008 and T009 first; they fail until done. Then T010, then T011.
- **US2:** T012 and T013 first. Then T014, then T015. T016 runs in parallel with them. T017 needs T014. T018 needs
  T016 and T017.
- **US3:**
  - T019 and T020 first.
  - Then T021, then T022, which needs T016 from US2. If US3 is done first, do T016 there.
  - Then T023, then T024.
- **Shared files:**
  - `hooks.ts` and `api.ts` are only touched in Phase 2.
  - `AdminLocationDialog.tsx` is only touched in T023. `WaterHeaterSection.tsx` is only touched in T018.

## Parallel examples

```text
Phase 2:  T002 (format.ts) ∥ T003 (types.ts) ∥ T005 (keyReminders.ts) ∥ T006 (keyReminders.test.ts)
Stories:  T010–T011 (banner) ∥ T014–T018 (heater date) ∥ T021–T024 (sensor key)
Tests:    T008 ∥ T009 ∥ T012 ∥ T013 ∥ T019 ∥ T020
```

## Implementation strategy

1. **MVP = Phases 1–3:** the banner. It already works for sensor keys, since their dates are in the API, and for the
   heater keys the migration filled in.
2. **Then US3:** the replace button, so a reminder can be acted on in the app.
3. **Then US2:** entering and changing the heater date.
4. **Commit and open a PR only when Roy asks.** Suggested commits:
   - "Read key reminders and expiry dates from the API"
   - "Remind administrators of keys that expire soon"
   - "Enter and change the water heater key's expiry date"
   - "Replace a sensor key from Admin"
