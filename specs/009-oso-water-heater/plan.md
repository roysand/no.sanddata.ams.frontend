# Implementation Plan: Connect and Show the OSO Water Heater

**Branch**: `009-oso-water-heater` | **Date**: 2026-11-19 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/009-oso-water-heater/spec.md`

## Summary

Two pieces on top of the API's spec 011 (deployed 2026-11-19):

1. **Admin**: a "Water heater" section in `AdminLocationDialog`, below Access. It reads
   `GET /api/admin/locations/{id}/water-heater` (404 → "No water heater connected"), connects or replaces with `PUT`
   (in its own dialog: device id + password-style key, Zod rules that mirror the API's validator, "Checking with
   OSO…" while waiting) and removes with `DELETE` after a confirmation dialog. The location dialog's Cancel and "Save
   location" sit together at its bottom (research R6). The key lives only in the form and is never
   kept in the query or mutation cache.
2. **Heater tab**: a `WaterHeaterCard` on its own page, `WaterHeaterPage`, reached by a Heater tab in the bottom bar
   that is shown only for a location with a heater (research R9; first placed on the Now page after `RecentUsage`).
   It polls `GET /api/locations/{id}/water-heater` once a minute while the page is open and visible, renders nothing on 404, shows the API's message on 502/503, and otherwise
   shows litres of 40 °C water (with a fill bar), showers and baths, the top temperature with mid and low as details,
   heating with kW, a special mode with its Oslo end time, and the reading's age, ticking between fetches.

Both follow the existing split: admin calls in `features/admin`, the dashboard card in `features/dashboard` (as the
bill feature did in spec 008). No new dependency, no API change.

## Technical Context

**Language/Version**: TypeScript 5 (strict), React 19

**Primary Dependencies**: Vite, TanStack Query 5, React Hook Form + Zod, shadcn/ui (Radix), Tailwind CSS 4,
lucide-react; no new ones

**Storage**: N/A (server state in the TanStack Query cache only; the key is never stored)

**Testing**: Vitest + React Testing Library + user-event + MSW (`src/test/server.ts`, `renderWithQuery`)

**Target Platform**: Modern browsers, phone width first (the dashboard is used on phones)

**Project Type**: Single-page web app (frontend for `no.sanddata.ams.api`)

**Performance Goals**: One state request per minute per open dashboard (SC-004, edge case "Two dashboards"); no
polling in a hidden tab

**Constraints**: The connect call may take up to 10 s (OSO check); the key must not reach any store, URL, log or the
query/mutation cache (FR-005, Principle V)

**Scale/Scope**: One heater per location; 2 new components, 1 confirmation dialog, ~5 API functions, 1 schema, 2
helpers in `format.ts`

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                    | How the plan meets it                                                                                                                                                                                                     | Status |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| I. Feature-sliced            | Admin section and its api/hooks/schema in `features/admin`; card, api, hooks, types in `features/dashboard`. No cross-slice internals: the dialog already imports from `../locations` (public index), nothing new crosses | ✅     |
| II. One gateway              | All five calls through `api.get/put/delete` in the slices' `api.ts`; the admin GET's 404 is turned into `null` there (R2), not in components                                                                              | ✅     |
| III. TanStack Query          | `useWaterHeaterState` with `refetchInterval` 60 s and `enabled`; keys `['water-heater', 'state', locationId]` and `['admin', 'water-heater', locationId]`; connect/remove invalidate both                                 | ✅     |
| IV. Validated forms          | `waterHeaterSchema` in `admin/schema.ts`, commented as mirroring the API's validator (required, ≤ 200, no whitespace / hex only)                                                                                          | ✅     |
| V. Session and access safety | Key only in RHF state; mutation reset and `gcTime: 0` so it does not stay in the mutation cache (R4); not logged, not in URLs; section only inside the Admin pages (`AdminRoute`)                                         | ✅     |
| VI. Typed, lint-clean        | No `any`; the 404 check uses `instanceof ApiError`; shadcn primitives (`Card`, `Button`, `Input`, `PasswordInput`, `Dialog`, `Badge`)                                                                                     | ✅     |
| VII. Tests                   | Schema tests; helper tests (age text, Oslo date-time); component tests with MSW for both pieces, asserting text and roles                                                                                                 | ✅     |
| Oslo time via `format.ts`    | `formatAge` and `formatOsloDateTime` added to `dashboard/format.ts`                                                                                                                                                       | ✅     |

No violations; Complexity Tracking left empty.

**Re-check after Phase 1**: unchanged, all ✅. The design adds no slice, no dependency and no global state.

## Project Structure

### Documentation (this feature)

```text
specs/009-oso-water-heater/
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R9
├── data-model.md        # Phase 1: types and view states
├── quickstart.md        # Phase 1: how to validate
├── contracts/
│   └── api-usage.md     # Phase 1: endpoints called and how the UI reacts
└── tasks.md             # Phase 2 (/speckit-tasks, not created here)
```

### Source Code (repository root)

```text
src/app/routes.tsx                   # + /water-heater
src/components/
├── AppLayout.tsx                    # + useHasWaterHeater(selected?.id) → TabBar
└── TabBar.tsx                       # + Heater tab when hasWaterHeater (4 columns)

src/features/admin/
├── AdminLocationDialog.tsx          # + <WaterHeaterSection /> below Access; Cancel + Save location in the footer
├── WaterHeaterSection.tsx           # new: status, Connect/Replace form, Remove
├── WaterHeaterSection.test.tsx      # new
├── ConnectWaterHeaterDialog.tsx     # new: the connect / replace form in its own dialog
├── RemoveWaterHeaterDialog.tsx      # new: confirmation ("stored power history is kept")
├── api.ts                           # + getWaterHeaterSettings (404 → null), connectWaterHeater, removeWaterHeater
├── hooks.ts                         # + useWaterHeaterSettings, useWaterHeaterActions
├── schema.ts                        # + waterHeaterSchema
├── schema.test.ts                   # + its rules
└── types.ts                         # + WaterHeaterSettings, WaterHeaterInput

src/features/dashboard/
├── WaterHeaterPage.tsx              # new: the Heater tab's page (/water-heater)
├── WaterHeaterPage.test.tsx         # new
├── WaterHeaterCard.tsx              # new
├── WaterHeaterCard.test.tsx         # new
├── api.ts                           # + getWaterHeaterState
├── hooks.ts                         # + useWaterHeaterState, useNow (ticking clock)
├── format.ts                        # + formatAge, formatOsloDateTime, formatCelsius
├── format.test.ts                   # + their cases
└── types.ts                         # + WaterHeaterState and parts
```

**Structure Decision**: Extend the two existing slices, as spec 008 did (Admin pricing field in `admin`, bill card in
`dashboard`). A new `waterHeater` slice was considered (R1) and left out: it would hold one card and one section that
each belong to pages the other slices own.

## Complexity Tracking

None.
