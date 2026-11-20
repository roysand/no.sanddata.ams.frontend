# Implementation Plan: Remind Administrators Before Keys Expire

**Branch**: `011-key-expiry-reminders` | **Date**: 2026-11-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/011-key-expiry-reminders/spec.md`. The API contract is in
`no.sanddata.ams.api/specs/015-key-expiry-reminders/contracts/endpoints.md`.

## Summary

1. **API calls and types (admin slice).**
   - **New calls in `api.ts`:**
     - `getKeyReminders()` → `GET /api/admin/key-reminders`
     - `setWaterHeaterKeyExpiry(id, date)` → `PUT …/water-heater/key-expiry`
     - `rotateSensorKey(id)` → `POST /api/admin/locations/{id}/api-key/rotate`
   - **`connectWaterHeater`:** also sends `keyExpiresOn`.
   - **Types:** `WaterHeaterSettings` gains `keyExpiresOn`. There are new `KeyReminders` and `RotatedKey` types.
2. **The banner (US1).**
   - **Where:** a new `KeyReminderBanner` in `features/admin`, rendered by `AppLayout` above `<Outlet />` for
     administrators only.
   - **Data:** it reads `useKeyReminders(enabled = isAdmin)`, key `['admin','key-reminders']`, refetched every hour and
     on focus. With no items, or on an error, it renders nothing.
   - **Content:**
     - Each line comes from the pure `reminderText(reminder)`, for example "The sensor key for Hytta expires in 12 days".
     - Each line links to `/admin/locations?edit={id}&key=sensor|heater`.
     - Expired lines are urgent (destructive colours).
     - At most 3 lines, then "and N more" (research R2, R3).
3. **The heater key's date (US2).**
   - **`waterHeaterSchema`** gains `keyExpiresOn`: required, a real date, after today in Oslo, at most 5 years ahead.
   - **`ConnectWaterHeaterDialog`** gets a "Key valid until" date input, defaulting to today + 1 year.
   - **`WaterHeaterSection`** shows "Key valid until 19.11.2027", with an `ExpiryBadge`, and a "Change date" button.
     That opens the new `KeyExpiryDialog`, a date only.
4. **The sensor key (US3).**
   - **`SensorKeySection`** (new, in `AdminLocationDialog`) replaces the one line "Sensor key …hint · status".
   - **It shows:** the status, "expires 02.12.2026", and an `ExpiryBadge`.
   - **Replace:** a "Replace sensor key" button opens `ReplaceSensorKeyDialog`, which confirms, then calls rotate. It
     then shows the new key with the locations slice's public `SensorKeyNotice`. The key lives only in the mutation
     result and that dialog's state. `gcTime: 0` and `reset()` on close, as for the heater key (research R5).
5. **Opening from the banner.** `AdminLocationsPage` reads `?edit=` on mount to open that location's dialog, and `?key=`
   to scroll to and focus the key's section. It clears both from the URL when the dialog closes (research R4).
6. **Refresh (FR-010).** The changes to the heater date, connect or replace, and rotate invalidate
   `['admin','locations']`, `['admin','water-heater',id]` and `['admin','key-reminders']`.

## Technical Context

**Language/Version**: TypeScript 5 (strict), React 19

**Primary Dependencies**:

- Already in use: TanStack Query 5, React Hook Form + Zod, shadcn/ui (Dialog, Badge, Button, Input), React Router 7,
  lucide-react.
- **No new dependencies.** The date field is a native `<input type="date">` through the shadcn `Input`, which gives
  `yyyy-MM-dd`.

**Storage**: none. The reminder list and the rotated key are never written to `localStorage`, and the rotated key is
never cached beyond the mutation.

**Testing**: Vitest + Testing Library + MSW.

- Pure tests:
  - `reminderText`
  - the expiry badge rule
  - the date rule in the schema, including the edges at today and at 5 years
- Component tests:
  - `KeyReminderBanner`, inside `AppLayout`, for an administrator and for another user
  - `ConnectWaterHeaterDialog`, the date field
  - `WaterHeaterSection` with `KeyExpiryDialog`
  - `SensorKeySection` with `ReplaceSensorKeyDialog`
  - `AdminLocationsPage` opening from `?edit=`

**Target Platform**: a mobile-first browser SPA, at 375 px, in light and dark mode (SC-004).

**Project Type**: web (frontend SPA against the existing API)

**Performance Goals**:

- **Administrators:** one extra request when the app opens, then one an hour.
- **Everyone else:** no extra requests (SC-003).

**Constraints**:

- No key in storage, a URL or a log (FR-011, SC-005).
- The days are the API's (`daysLeft`), never counted in the app.
- The date rule mirrors the API's and is commented as such (Principle IV).

**Scale/Scope**:

- New: 1 banner, 2 dialogs, 1 section, 1 pure text module, 3 API calls and 3 hooks.
- Changed: the schema, the connect dialog, the heater section, the location dialog, the Admin locations page,
  `AppLayout`, `format.ts` (+ `osloToday`), and the MSW fixtures.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle             | How the plan meets it                                                                                                                                                                                                                                                                            | Status |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| I. Feature slices     | Everything key-related is in `features/admin`. `AppLayout` imports the banner from its file, as `routes.tsx` already imports admin pages. The admin slice uses the locations slice's public `SensorKeyNotice` and the dashboard's public `formatOsloDate`/`osloToday`, through their `index.ts`. | ✅     |
| II. One gateway       | The three new calls are in `admin/api.ts`, through `apiClient`.                                                                                                                                                                                                                                  | ✅     |
| III. TanStack Query   | `useKeyReminders` has the hierarchical key `['admin','key-reminders']`, `enabled: isAdmin`, and a `refetchInterval` of 1 h. The mutations invalidate the affected keys. No server data is copied into state; the one-time key is a mutation result, not cached data.                             | ✅     |
| IV. Validated forms   | The date is part of `waterHeaterSchema`, and `KeyExpiryDialog` has its own small schema. The range rule is commented as mirroring the API (spec 015 FR-003).                                                                                                                                     | ✅     |
| V. Session safety     | The new key: no storage, no URL, no log, `gcTime: 0`, and `reset()` on close. The banner's query and the link parameters carry ids only.                                                                                                                                                         | ✅     |
| VI. Typed, lint-clean | Strict types, no new libraries, shadcn primitives and Tailwind tokens.                                                                                                                                                                                                                           | ✅     |
| VII. Tests            | Pure and component tests with MSW for every story, including that a user who isn't an administrator makes no request.                                                                                                                                                                            | ✅     |
| Oslo time             | `osloToday()` is added to `features/dashboard/format.ts` and exported through its index. It is used only for the form's default and its range check. The banner uses the API's days.                                                                                                             | ✅     |

**Re-check after Phase 1**: unchanged, all pass, with no deviations.

## Project Structure

### Documentation (this feature)

```text
specs/011-key-expiry-reminders/
├── plan.md              # This file
├── research.md          # Phase 0: R1–R7
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   ├── api.md           # Phase 1: the endpoints used
│   └── ui.md            # Phase 1: texts and where things are
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── components/AppLayout.tsx           # + <KeyReminderBanner /> for administrators, above <Outlet />
├── features/dashboard/
│   ├── format.ts                      # + osloToday(now): yyyy-MM-dd in Oslo
│   └── index.ts                       # + export osloToday
├── features/admin/
│   ├── api.ts                         # + getKeyReminders, setWaterHeaterKeyExpiry, rotateSensorKey; connect sends keyExpiresOn
│   ├── types.ts                       # + KeyReminder(s), RotatedKey; WaterHeaterSettings.keyExpiresOn; WaterHeaterInput.keyExpiresOn
│   ├── hooks.ts                       # + useKeyReminders, useSetKeyExpiry, useRotateSensorKey; invalidations
│   ├── schema.ts                      # + keyExpiresOn on waterHeaterSchema; keyExpirySchema
│   ├── keyReminders.ts / .test.ts     # new: reminderText, expiryBadge (pure)
│   ├── KeyReminderBanner.tsx / .test.tsx  # new
│   ├── ExpiryBadge.tsx                # new: "expires in N days" or "expired"
│   ├── ConnectWaterHeaterDialog.tsx   # + "Key valid until" date
│   ├── WaterHeaterSection.tsx / .test.tsx  # + date line, badge, Change date
│   ├── KeyExpiryDialog.tsx            # new: the date only
│   ├── SensorKeySection.tsx / .test.tsx    # new: status, expiry, Replace sensor key
│   ├── ReplaceSensorKeyDialog.tsx     # new: confirm, then the new key once
│   ├── AdminLocationDialog.tsx        # SensorKeySection replaces the one line; section ids for ?key=
│   └── AdminLocationsPage.tsx / .test.tsx  # open from ?edit=&key=, clear them on close
└── test/                              # fixtures: reminders, settings with keyExpiresOn, rotate answer
```

**Structure Decision**: Keys are managed only in Admin, so everything lives in the admin slice. The banner is the only
piece outside the Admin pages, and `AppLayout` mounts it the same way it mounts the header.

## Complexity Tracking

None. No principle is broken.
