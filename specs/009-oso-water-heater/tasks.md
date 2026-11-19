---
description: 'Task list for Connect and Show the OSO Water Heater'
---

# Tasks: Connect and Show the OSO Water Heater

**Input**: Design documents from `/specs/009-oso-water-heater/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md),
[contracts/api-usage.md](contracts/api-usage.md), [quickstart.md](quickstart.md)

**Tests**: Included. The constitution (Principle VII) requires tests for new branching logic (formatting, API
normalization, Zod schemas) and for components that use queries: MSW at the network boundary
(`src/test/server.ts`, `server.use(http.get(...))`), a fresh `QueryClient` per test (`renderWithQuery` in
`src/test/render.tsx`, retries off), assertions on roles, labels and text. Never mock `apiClient` or the hooks.

**Number format in tests**: `nb-NO` writes a no-break space before units and U+2212 as minus. Compare through
`plain()` from `src/test/text.ts`.

**Organization**: One phase per user story. US1 (Admin) and US2 (dashboard) touch different slices and share
nothing, so they can be built in either order or in parallel. There is no foundational phase.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: The user story the task belongs to (US1, US2)

## Path Conventions

Single project: `src/features/<slice>/…`, shared test setup in `src/test/`.

---

## Phase 1: Setup

**Purpose**: A clean baseline on the feature branch.

- [x] T001 On branch `009-oso-water-heater` (already up to date with `main`), confirm `npm test`, `npm run lint` and `npm run build` pass before any change (repository root)

---

## Phase 2: User Story 1 - An administrator connects the water heater to a location (Priority: P1) 🎯 MVP

**Goal**: A Water heater section in the Admin location dialog to connect, replace and remove the heater.

**Independent Test**: As Admin, open a location without a heater, connect with a pair the API accepts and see
"Connected", the shortened id and the date; try a pair the API rejects and see its message in the form, values kept,
nothing changed.

### Types, API and hooks

- [x] T002 [P] [US1] Add to `src/features/admin/types.ts`: `WaterHeaterSettings { locationId: string; deviceIdHint: string; connectedAt: string; updatedAt: string }` (UTC ISO strings; doc comment "there is no field for the key") and `WaterHeaterInput { deviceId: string; subscriptionKey: string }`
- [x] T003 [US1] Add to `src/features/admin/api.ts`: `getWaterHeaterSettings(locationId): Promise<WaterHeaterSettings | null>` calling `api.get` on `/api/admin/locations/${locationId}/water-heater` and returning `null` when it throws an `ApiError` with `status === 404` (rethrow anything else; research R2); `connectWaterHeater(locationId, input: WaterHeaterInput)` → `api.put<WaterHeaterSettings>` on the same path with body `{ subscriptionKey, deviceId }`; `removeWaterHeater(locationId)` → `api.delete<void>` on the same path, treating a 404 as success (contracts/api-usage.md). Never log the input (depends on T002)
- [x] T004 [US1] Add to `src/features/admin/hooks.ts`: `const WATER_HEATER_KEY = ['admin', 'water-heater']`; `useWaterHeaterSettings(locationId)` with key `[...WATER_HEATER_KEY, locationId]`; `useWaterHeaterActions(locationId)` returning `connect` (`useMutation` with `gcTime: 0`, research R4) and `remove` mutations, both invalidating `[...WATER_HEATER_KEY, locationId]` and `['water-heater', 'state', locationId]` on success (depends on T003)

### Schema

- [x] T005 [P] [US1] Write the cases first in `src/features/admin/schema.test.ts` (fail until T006): empty device id → "Device id is required"; empty key → "Subscription key is required"; key `"abc def"` → "The key cannot contain spaces"; device id `"4b88zz"` → "Device id can only contain 0-9 and a-f"; 201-character key and device id → "At most 200 characters"; `" 4B8814ab "` passes and is trimmed to `"4B8814ab"`; a valid pair passes
- [x] T006 [US1] Add `waterHeaterSchema` to `src/features/admin/schema.ts` with the comment "Same rules as the API's water heater validator (spec 011), so mistakes are caught before OSO is asked": `deviceId: z.string().trim().min(1, 'Device id is required').max(200, 'At most 200 characters').regex(/^[0-9a-fA-F]+$/, 'Device id can only contain 0-9 and a-f')`; `subscriptionKey: z.string().min(1, 'Subscription key is required').max(200, 'At most 200 characters').regex(/^\S+$/, 'The key cannot contain spaces')` (not trimmed); export `WaterHeaterFormValues = z.infer<typeof waterHeaterSchema>` (depends on T005)

### UI

- [x] T007 [P] [US1] Create `src/features/admin/RemoveWaterHeaterDialog.tsx`, modelled on `DeleteUserDialog.tsx`: props `locationName`, `isPending`, `error: string | null`, `onConfirm`, `onCancel`; title "Remove water heater", description "The key and device id are deleted from {locationName} and readings stop. The stored power history is kept."; buttons Cancel and destructive "Remove" ("Removing…" and disabled while pending); the error shown as `text-destructive`
- [x] T008 [US1] Write `src/features/admin/WaterHeaterSection.test.tsx` first (fail until T009), rendering `<WaterHeaterSection location={...} />` with `renderWithQuery` and MSW handlers on `*/api/admin/locations/:id/water-heater`: (a) GET 404 → "No water heater connected" and a "Connect" button; (b) submitting empty shows both required messages and sends no PUT; (c) a valid connect where the PUT handler waits shows "Checking with OSO…" with the save button disabled, then on 200 `{ deviceIdHint: '4b8814…49499d', connectedAt: '2026-11-20T10:00:00Z', … }` (GET now answers 200) shows "Connected", `4b8814…49499d`, the Oslo date `20.11.2026`, and the form is gone; (d) PUT 400 `{ errors: { generalErrors: ['OSO rejected the key or device id'] } }` shows that message, keeps the typed device id and key, and still shows "No water heater connected"; (e) PUT 400 with `errors: { deviceId: ['…'] }` shows the message under the device id field; (f) connected → "Replace" opens the form with both fields empty; (g) "Remove" opens the dialog with "The stored power history is kept", confirm sends DELETE and ends at "No water heater connected"; (h) the key input has `type="password"` and `autocomplete="off"` (depends on T004, T006, T007)
- [x] T009 [US1] Create `src/features/admin/WaterHeaterSection.tsx`: `<section aria-label="Water heater">` with heading "Water heater", styled like `LocationAccessList`. Uses `useWaterHeaterSettings(location.id)`. States per data-model.md "Water heater section": loading (small skeleton); load error (message, no buttons); `null` → "No water heater connected" + "Connect"; settings → `Badge` "Connected", `deviceIdHint` in `font-mono`, "connected {Oslo date}" (and "changed {date}" when `updatedAt` ≠ `connectedAt`), buttons "Replace" and "Remove". Connect/Replace toggles an inline child form component (so closing unmounts it and drops the key, research R4/R6) using React Hook Form + `zodResolver(waterHeaterSchema)`: `Input` "Device id" (`autoComplete="off"`, `spellCheck={false}`), `PasswordInput` "Subscription key" (`autoComplete="off"`, `data-1p-ignore`, `data-lpignore="true"`, research R5), hint "Both are in the OSO app or at OSO's website.", buttons Cancel and Save ("Checking with OSO…" and disabled while `connect.isPending`). On success: `connect.reset()`, close the form. On error: map `ApiError.fieldErrors` `deviceId` / `subscriptionKey` to field errors via `setError`, otherwise show `error.message` with `role="alert"`; keep values. Cancel calls `connect.reset()` and closes. Remove opens `RemoveWaterHeaterDialog` and on success closes it. Never put the key in component state outside RHF, a URL or `console` (depends on T004, T006, T007)
- [x] T010 [US1] Render `<WaterHeaterSection location={location} />` in `src/features/admin/AdminLocationDialog.tsx` right after `<LocationAccessList location={location} />`; render `RemoveWaterHeaterDialog` from the section itself so it sits outside the form flow (depends on T009)

**Checkpoint**: T008 passes; the heater can be connected from the Admin pages (quickstart §2).

---

## Phase 3: User Story 2 - The household sees the water heater on the dashboard (Priority: P1)

**Goal**: A Water heater card on the dashboard with the live state, refreshed once a minute; no card without a heater.

**Independent Test**: With the spec's state (333 of 360 l, 3 showers, 1 bath, top 70,1 °C, not heating, 0,0117 kW,
normal mode, 94 s old), the card shows these figures and "updated 1 minute ago"; a 404 shows no card.

### Types, helpers, API and hooks

- [x] T011 [P] [US2] Add to `src/features/dashboard/types.ts` exactly as in data-model.md: `WaterHeaterMode = 'None' | 'Holiday' | 'Supercharge' | 'BlueBattery'`; `WaterHeaterState { locationId: string; readingTime: string; ageSeconds: number; isStale: boolean; isOnline: boolean; isHeating: boolean; setPointCelsius: number | null; temperatures: { topCelsius: number | null; midCelsius: number | null; lowCelsius: number | null; fourthCelsius: number | null }; hotWater: { availableLitres40: number | null; maxLitres40: number | null; showers: number | null; baths: number | null; storedEnergyKwh: number | null }; powerKw: number; specialMode: { mode: WaterHeaterMode; start: string | null; end: string | null; profileName: string | null }; osoCodes: Record<string, number | null> }` with the comment "a value OSO does not give is null, never 0"
- [x] T012 [P] [US2] Write the cases first in `src/features/dashboard/format.test.ts` (fail until T013): `formatAge(0)` and `formatAge(59)` → "updated just now"; `formatAge(94)` → "updated 1 minute ago"; `formatAge(300)` → "updated 5 minutes ago"; `formatAge(7200)` → "updated 2 hours ago"; `formatAge(-5)` → "updated just now"; `formatCelsius(70.1)` → "70,1 °C", `formatCelsius(72)` → "72,0 °C"; `formatOsloDateTime(iso, now)` → "today 19:40" when `iso` is later the same Oslo day as `now`, "tomorrow 19:40" for the next Oslo day, "20.11. 19:40" otherwise, with one case across the DST change (2026-10-25)
- [x] T013 [US2] Add to `src/features/dashboard/format.ts`: `formatAge(seconds: number)` (< 60 → "updated just now"; < 3600 → whole minutes, "1 minute" / "N minutes"; else whole hours, "1 hour" / "N hours"; negative treated as 0, research R7); `formatCelsius(value)` (one decimal, nb-NO, ` °C`, reuse `oneDecimal`); `formatOsloDateTime(isoUtc, now = new Date())` in Europe/Oslo ("today HH:mm", "tomorrow HH:mm", else "dd.MM. HH:mm", research R8) using the existing `OSLO` constant (depends on T012)
- [x] T014 [US2] Add `getWaterHeaterState(locationId)` to `src/features/dashboard/api.ts`: `api.get<WaterHeaterState>(`/api/locations/${locationId}/water-heater`)` (depends on T011)
- [x] T015 [US2] Add to `src/features/dashboard/hooks.ts`: `useWaterHeaterState(locationId: string | undefined)` with key `['water-heater', 'state', locationId]`, `enabled: !!locationId`, `retry: false`, and `refetchInterval: (query) => query.state.error instanceof ApiError && query.state.error.status === 404 ? false : ONE_MINUTE` (research R3; `refetchIntervalInBackground` left at its default `false`); and `useNow(intervalMs: number): number` returning `Date.now()` refreshed by a `setInterval` cleared on unmount (depends on T014)

### UI

- [x] T016 [US2] Write `src/features/dashboard/WaterHeaterCard.test.tsx` first (fail until T017), with MSW on `*/api/locations/:id/water-heater` and a `state(patch)` builder from the spec's figures (availableLitres40 333, maxLitres40 360, showers 3, baths 1, topCelsius 70.1, midCelsius 68.4, lowCelsius 55.2, isHeating false, powerKw 0.0117, mode None, ageSeconds 94, isStale false, isOnline true): (a) shows "333 of 360 l", a `meter` with value 333 and max 360, "3 showers", "1 bath", "70,1 °C", "Not heating", "updated 1 minute ago", and no "kW" and no mode text; (b) `midCelsius: null, lowCelsius: null` → neither temperature detail and no "0,0 °C"; `availableLitres40: null` → no litres line and no meter; (c) `isHeating: true, powerKw: 2.04` → "Heating" and "2,0 kW"; (d) `mode: 'Supercharge', end` later today → "Supercharge" and "until today HH:mm"; `mode: 'Holiday'` likewise; `mode: 'BlueBattery'` shows no mode; (e) `isStale: true, ageSeconds: 1200` → "Reading is old" and "updated 20 minutes ago"; (f) `isOnline: false` → "Heater is offline"; (g) 404 → the component renders nothing (`container` empty after the request settles); (h) 503 `{ errors: { generalErrors: ['OSO is unavailable'] } }` → the "Water heater" title and "OSO is unavailable"; (i) with fake timers, after 60 s the age text reads "updated 2 minutes ago" without a new response being needed (depends on T011, T013, T015)
- [x] T017 [US2] Create `src/features/dashboard/WaterHeaterCard.tsx` (`{ locationId }`), modelled on `CapacityCard`'s `Card`/`CardHeader`/`CardTitle` "Water heater". States per data-model.md "Water heater card": loading → skeleton with `aria-busy`; `ApiError` 404 → `return null`; other error → title + `error.message` (`text-sm text-destructive`), never stale figures; data → (1) litres line "{available} of {max} l" (40 °C water) and a bar `div role="meter" aria-valuenow aria-valuemin={0} aria-valuemax` with width clamped to 0–100 % (both values needed, else neither); (2) "{n} showers · {n} bath(s)" for the counts that are not null, singular for 1; (3) top temperature via `formatCelsius` as the main figure, "middle" and "bottom" details only when not null, "set to X" when `setPointCelsius` is not null; (4) "Heating · {formatKw(powerKw)}" when `isHeating`, else "Not heating"; (5) for `Holiday` / `Supercharge`, a `Badge` with the mode and "until {formatOsloDateTime(end)}" when `end` is not null; nothing for `None` / `BlueBattery`; (6) footer: `formatAge(ageSeconds + (now − dataUpdatedAt) / 1000)` with `now = useNow(30_000)`, "Reading is old" when `isStale` or the computed age > 900, "Heater is offline" when `!isOnline`. Never show `fourthCelsius`, `storedEnergyKwh` or `osoCodes` (AS 2.9). Must fit 375 px width (depends on T013, T015, T016)
- [x] T018 [US2] Render `<WaterHeaterCard locationId={selected.id} />` in `src/features/dashboard/DashboardPage.tsx` right after `<RecentUsage … />` (research R9); check `src/features/dashboard/DashboardPage.test.tsx` still passes, adding a 404 handler for the new endpoint if unhandled requests fail the test (depends on T017)

**Checkpoint**: T016 passes; the card appears for Hjemme and not for other locations (quickstart §3).

---

## Phase 4: Polish & Cross-Cutting Concerns

- [x] T019 Run `npm run format`, `npm test`, `npm run lint`, `npm run build`; all pass (repository root)
- [x] T020 [P] Update `backlog.md`: the OSO item points to spec 009 as built (read and show); heater control and kWh/cost history stay open
- [ ] T021 Manual check against the deployed API as Admin per quickstart §2 (connect Hjemme, wrong id rejected, Replace empty)
- [ ] T022 Manual check per quickstart §3: figures match the OSO app, one request a minute in the Network tab and none while hidden, no card for a location without a heater, no overflow at 375 px

---

## Dependencies & Execution Order

- **T001** first.
- **US1** (T002–T010) and **US2** (T011–T018) are independent: different slices, no shared files. Either can be the MVP;
  US1 comes first because the card has nothing to show until a heater is connected (spec US1 "Why this priority").
- Within US1: T002 → T003 → T004; T005 → T006; T004 + T006 + T007 → T008 → T009 → T010.
- Within US2: T011 → T014 → T015; T012 → T013; T011 + T013 + T015 → T016 → T017 → T018.
- **Polish** after both stories; T021 needs US1 deployed or the dev server, T022 needs US1 done at Hjemme.

## Parallel Opportunities

```text
After T001:
  US1: T002, T005, T007          (types, schema tests, remove dialog — different files)
  US2: T011, T012                (types, format tests)
Across stories: the whole of US1 can run beside the whole of US2.
```

## Implementation Strategy

1. **MVP = US1**: connect the heater at Hjemme from the app (SC-001). Without it the card is never shown.
2. **Then US2**: the dashboard card, which is what the household uses (SC-003).
3. One PR with both stories is fine (about 10 files); split into two PRs if US1 is wanted in production first.
