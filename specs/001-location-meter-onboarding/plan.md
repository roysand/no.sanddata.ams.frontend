# Implementation Plan: Location and Meter Onboarding

**Branch**: `feature/admin-location-meter-onboarding` | **Date**: 2026-10-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-location-meter-onboarding/spec.md`

## Summary

Let users register their own locations and meters, and let administrators do the same for any user.
A new `features/locations/` slice owns the API calls, TanStack Query hooks, Zod schemas and shared
forms (location form, meter form, one-time sensor key notice). Two entry points use it: a
two-step setup wizard for a signed-in user (`/setup`, plus a `/locations` view for adding more), and
"Add location" / "Add meter" actions per user on the existing admin users page. Delivery is
staged: the admin flow works with today's API; the self-service flow needs one new backend endpoint
(see [contracts/backend-required.md](./contracts/backend-required.md)).

## Technical Context

**Language/Version**: TypeScript 5.9 (strict), React 19, Node.js 22+

**Primary Dependencies**: Vite, React Router 7, TanStack Query 5, React Hook Form + Zod 4, shadcn/ui
(Radix), Tailwind CSS 4, lucide-react. No new runtime dependencies.

**Storage**: None on the client for this feature. The sensor key is held in component state only and
discarded on dismissal (FR-006).

**Testing**: Vitest + React Testing Library + user-event + MSW (constitution Principle VII).

**Target Platform**: Modern desktop and mobile browsers; served by Vite, API at the Hetzner host.

**Project Type**: Web application (frontend only; the API is a separate repository).

**Performance Goals**: Forms respond instantly; lists refresh after a mutation without a reload
(query invalidation).

**Constraints**: All calls through `lib/apiClient.ts`; the sensor key never reaches storage, logs or
URLs; non-admins must not see admin actions.

**Scale/Scope**: Two new routes, about six components, one new slice. Few users and locations.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | How the plan complies |
|---|---|---|
| I. Feature-sliced structure | Pass | New `features/locations/` slice; admin and wizard consume it only through `features/locations/index.ts`. Existing `admin/UsersPage` already imports `useLocations` from `dashboard`; the new slice takes ownership of location hooks and `dashboard` re-uses them from the same barrel (see Complexity Tracking). |
| II. One gateway to the API | Pass | All calls via `api.*`; no `fetch`. |
| III. Server state via TanStack Query | Pass | `hooks.ts` with `['locations']`, `['admin','users']` invalidation; mutations invalidate on success. |
| IV. Validated forms | Pass | RHF + Zod schemas in `locations/schema.ts`, rules mirrored from the API validators and commented as such. |
| V. Session and access safety | Pass | Admin actions render only for `Admin`; `/setup` and `/locations` sit under `ProtectedRoute`. Sensor key kept in memory only. |
| VI. Typed, lint-clean | Pass | Strict TS, shadcn primitives, `@/` alias. |
| VII. Tests | Pass | Vitest + RTL + MSW tests for schemas, forms, wizard and admin dialogs. |

**Post-design re-check**: Pass, with the one noted cross-slice item below.

## Project Structure

### Documentation (this feature)

```text
specs/001-location-meter-onboarding/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── existing-api.md
│   └── backend-required.md
└── tasks.md             # created by /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── app/routes.tsx                         # add /setup and /locations under ProtectedRoute
├── features/
│   ├── locations/                         # NEW slice
│   │   ├── index.ts                       # public surface used by other slices
│   │   ├── api.ts                         # getLocations (moved), createLocation, createMeter
│   │   ├── hooks.ts                       # useLocations, useCreateLocation, useCreateMeter
│   │   ├── types.ts                       # LocationSummary, MeterSummary, CreatedLocation, ...
│   │   ├── schema.ts                      # locationSchema, meterSchema (Zod)
│   │   ├── LocationForm.tsx
│   │   ├── MeterForm.tsx
│   │   ├── SensorKeyNotice.tsx            # show-once key, copy button, warning
│   │   ├── SetupWizard.tsx                # step 1 location, step 2 meter (+ resume)
│   │   ├── SetupPage.tsx                  # route /setup
│   │   └── LocationsPage.tsx              # route /locations: own locations + add actions
│   ├── admin/
│   │   ├── AddLocationDialog.tsx          # NEW: create + link for the chosen user
│   │   ├── AddMeterDialog.tsx             # NEW: pick the user's location, register meter
│   │   ├── UsersPage.tsx                  # add row actions (Add location / Add meter)
│   │   └── api.ts / hooks.ts              # reuse setLocationLink; add admin create-location call
│   └── dashboard/
│       └── DashboardPage.tsx              # empty state -> guided into /setup
└── test/                                  # existing setup; add MSW handlers per test
```

**Structure Decision**: One new frontend slice (`features/locations/`) because locations and meters
are used by three places (dashboard picker, wizard, admin users). Admin-specific dialogs stay in
`features/admin/` and compose the shared forms.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Cross-slice imports (`admin` and `dashboard` import from `locations`) | Locations and meters are shared domain objects | Duplicating the forms and hooks in three slices would drift; imports are limited to the `index.ts` barrel, not internals. |
