# Implementation Plan: Location Editing and Sharing

**Branch**: `feature/location-editing-sharing` | **Date**: 2026-10-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-location-editing-sharing/spec.md`

## Summary

Give each user-location link a role (owner or viewer) and build on it: owners edit their location's name,
address and active flag and their meters' comments; administrators share locations by adding viewers,
and get two overviews (users with their locations and roles, and all locations). The work extends the
`features/locations/` slice (types with role, owner edit form, inactive-confirmation, role gating) and the
`features/admin/` slice (a role-aware Users page and a new Locations page with an access dialog). Most of
what administrators need already exists in the API (edit all fields, link, unlink, list all locations);
the genuinely missing backend parts are a role on the link, an owner-side update, a meter comment
update, and richer read models (see [contracts/backend-required.md](./contracts/backend-required.md)).
Delivery is staged so the administrator pages can ship before the owner endpoints exist.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict), React 19, Node.js 22+

**Primary Dependencies**: Vite, React Router 7, TanStack Query 5, React Hook Form + Zod 4, shadcn/ui
(Radix), Tailwind CSS 4. No new runtime dependencies.

**Storage**: None on the client beyond what exists (selected location id, refresh token).

**Testing**: Vitest + React Testing Library + user-event + MSW (constitution Principle VII).

**Target Platform**: Modern desktop and mobile browsers; API at the Hetzner host.

**Project Type**: Web application (frontend only; the API is a separate repository).

**Performance Goals**: Lists and forms respond instantly; mutations refresh lists without a reload via
query invalidation.

**Constraints**: All calls through `lib/apiClient.ts`; role checks in the UI are UX only and the API
enforces them (Principle V); the error body carries no `code`, so errors are told apart by status and message.

**Scale/Scope**: One new admin route, one new owner dialog, a handful of components, about a dozen
tests files touched. Few users and locations.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | How the plan complies |
|---|---|---|
| I. Feature-sliced structure | Pass | Owner edit and role helpers live in `features/locations/`; admin pages in `features/admin/` import from `features/locations/index.ts` only. |
| II. One gateway to the API | Pass | All calls via `api.*` in each slice's `api.ts`. |
| III. Server state via TanStack Query | Pass | New hooks in each slice's `hooks.ts`; mutations invalidate `['locations']`, `['admin','users']` and `['admin','locations']`. |
| IV. Validated forms | Pass | RHF + Zod: `ownerLocationSchema` (name, address) reuses the 100-character rules, commented as mirroring the API. |
| V. Session and access safety | Pass | New admin routes sit under `AdminRoute`; owner actions are hidden for viewers, and the API is the authority (contract returns `404` to non-owners). No tokens or keys are touched. |
| VI. Typed, lint-clean | Pass | Strict TS; shadcn primitives; `@/` alias. |
| VII. Tests | Pass | MSW tests for schemas, owner form, confirmation, role gating, admin pages. A bug-fix style test pins that `hasReachedLocationLimit` counts owner links only. |

**Post-design re-check**: Pass, with the two noted items below.

## Project Structure

### Documentation (this feature)

```text
specs/002-location-editing-sharing/
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
├── app/routes.tsx                          # add /admin/locations under AdminRoute
├── components/Header.tsx                   # add admin nav item "Locations"
├── features/
│   ├── locations/
│   │   ├── types.ts                        # LocationRole, extended LocationSummary, LocationUser
│   │   ├── schema.ts                       # ownerLocationSchema, meterCommentSchema; owner-only limit count
│   │   ├── api.ts / hooks.ts               # updateOwnLocation, updateMeterComment (+ hooks)
│   │   ├── access.ts                       # canEdit(location), role helpers (UX only)
│   │   ├── EditLocationDialog.tsx          # owner form: name, address, active; system fields read-only
│   │   ├── ConfirmDeactivateDialog.tsx     # warning before turning a location off (shared with admin)
│   │   ├── EditMeterCommentDialog.tsx
│   │   ├── LocationsPage.tsx               # Edit / Add meter only for owners; inactive badge
│   │   └── index.ts                        # export the pieces admin needs
│   ├── admin/
│   │   ├── AdminLocationsPage.tsx          # NEW: all locations, owner, viewers, status
│   │   ├── AdminLocationDialog.tsx         # NEW: edit every field + manage access
│   │   ├── LocationAccessList.tsx          # NEW: owner/viewers, add viewer, change role, remove
│   │   ├── UsersPage.tsx                   # show role per location; viewer/owner actions
│   │   ├── api.ts / hooks.ts / types.ts    # getAdminLocations, updateLocationAsAdmin, setLink(role)
│   │   └── schema.ts                       # admin location schema reuses locations' rules
│   └── dashboard/
│       └── DashboardPage.tsx / LocationPicker.tsx   # hide inactive locations
└── test/                                   # MSW handlers per test, as before
```

**Structure Decision**: No new slice. Owner behaviour belongs to `locations` (it already owns the forms
and types); the administrator's cross-user views belong to `admin`, which composes the shared dialog
pieces through the `locations` barrel.

## Delivery order

1. **Admin Locations page and edit** (US4): works with today's API except the viewer count.
2. **Roles and sharing** (US2, US3): needs the link role and the `users` / `locationAccess` read models.
3. **Owner editing** (US1): needs `PUT /api/locations/{id}`, `PUT /api/meters/{id}` and the extended
   `GET /api/locations`.
4. **Wire-up**: dashboard hides inactive locations; `hasReachedLocationLimit` counts owners only.

The whole feature sits behind one constant, `LOCATION_SHARING_ENABLED`, in `features/locations/index.ts`
so the frontend can merge before the backend ships.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Cross-slice imports (`admin` imports dialogs and types from `locations`) | The admin edit dialog and the owner dialog share the deactivate confirmation and field rules | Duplicating them would let the two drift; imports go through the `index.ts` barrel only, as in feature 001. |
| Two read-model shapes for the same location (`LocationSummary` for users, `AdminLocation` for admins) | The admin shape carries key facts and users that ordinary users must never receive | One shape would leak admin-only data or hide data the admin needs. |
| A frontend feature flag until the backend ships | Backend and frontend are in separate repositories and release separately | Waiting to merge frontend code until the API is deployed blocks review and testing against MSW. |
EOF
cd /c/shared/repo/private/ams/no.sanddata.ams.frontend && git status --short && git diff --stat | tail -2