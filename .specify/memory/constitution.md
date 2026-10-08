# AMS Frontend Constitution

## Core Principles

### I. Feature-Sliced Structure
Code MUST live in `src/features/<feature>/`, one folder per vertical slice (e.g. `auth`, `dashboard`,
`admin`). A slice owns its pages, components, `api.ts`, `hooks.ts`, `types.ts` and, where it has
forms, `schema.ts`. `src/components/` is for shared layout and route guards, `src/components/ui/` for
shadcn primitives, `src/lib/` for cross-cutting infrastructure, and `src/app/` for router and
providers. A slice MUST NOT import from another slice's internals; shared needs move to `lib/` or
`components/`.
Rationale: mirrors the API's vertical-slice architecture, so a change touches one folder.

### II. One Gateway to the API
Every backend call MUST go through `src/lib/apiClient.ts` (`api.get/post/put/delete`). Components
MUST NOT call `fetch` directly. Base URL comes only from `VITE_API_BASE_URL`; nothing hard-codes a
host. Failures MUST surface as `ApiError` (status, code, message). Raw endpoint functions live in the
slice's `api.ts`, and those functions MUST return typed results (`types.ts`) and normalize known API
gaps there, not in components.
Rationale: auth headers, 401 refresh, error shape and JSON quirks are solved once.

### III. Server State via TanStack Query
Server data MUST be fetched with TanStack Query hooks defined in the slice's `hooks.ts`; components
consume hooks, not API functions. Query keys MUST be hierarchical and stable (e.g. `['admin',
'users', page, search]`). Mutations MUST invalidate the affected keys on success. Live data MUST set
an explicit `refetchInterval`, and queries that depend on a selection MUST use `enabled`. Server
data MUST NOT be copied into component state or global stores.
Rationale: one cache is the single source of truth and avoids stale or duplicated state.

### IV. Validated Forms
Forms MUST use React Hook Form with a Zod schema in the slice's `schema.ts`, with user-facing
messages in the schema. Client rules that mirror API rules (e.g. password complexity) MUST be
commented as such and kept in sync with the API. The client validates for convenience only; the API
remains the authority.
Rationale: errors are caught before the request while the API stays the source of truth.

### V. Session and Access Safety (NON-NEGOTIABLE)
The access token MUST be held in memory only; only the refresh token may be persisted
(`localStorage`), and only via `authStore`. Tokens, passwords and PII MUST NOT be logged or placed in
URLs. Protected pages MUST sit under `ProtectedRoute`, and admin pages under `AdminRoute`. Role
checks in the UI are UX only and MUST NOT be treated as security.
Rationale: limits the exposure of credentials and keeps authorization with the API.

### VI. Typed, Lint-Clean, Verified Code
TypeScript `strict` MUST stay on; `any` and non-justified type assertions are prohibited. `npm run
build` (type-check + build) and `npm run lint` MUST pass before merge. Code MUST follow Prettier
(`semi: false`, single quotes, width 100) via `npm run format`. UI MUST use shadcn/ui primitives,
Tailwind utilities and the `@/` import alias, not ad-hoc CSS or new component libraries. No automated
test runner exists yet; until one is adopted, each feature MUST be verified manually in the running
app and the steps recorded in its PR. Once a runner is adopted, new logic with branching (formatting,
date handling, API normalization) MUST ship with unit tests.
Rationale: strict types and lint catch most defects cheaply; the test gap is acknowledged, not hidden.

## Technology & Security Constraints

- Stack: React 19, TypeScript, Vite, Tailwind CSS 4 (CSS-first, no `tailwind.config.js`), React
  Router 7, TanStack Query 5, React Hook Form + Zod, shadcn/ui (Radix), Recharts, lucide-react.
  Adding a new runtime dependency requires justification in the PR.
- Node.js 22+.
- Local development against a remote API MUST use the Vite `/api` proxy with an empty
  `VITE_API_BASE_URL`; CORS is solved on the server or by the proxy, never by disabling browser
  security.
- Environment files MUST contain only `VITE_*` keys that the code reads, and MUST NOT contain
  secrets (everything in `VITE_*` ships to the browser).
- Time-based data MUST be computed in the Europe/Oslo timezone through the shared helpers in
  `features/dashboard/format.ts`, and sent to the API as UTC ISO strings.
- Charts MUST use the shared `components/ui/chart.tsx` wrapper.

## Development Workflow

- Work happens on a feature branch and merges to `main` through a pull request; `main` is not
  committed to directly.
- Each PR is one coherent change with a clear title and description, and passes build and lint.
- Features larger than a single component SHOULD go through the Spec Kit flow
  (`/speckit-specify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement`).
- Reviewers MUST check the PR against the principles above; deviations MUST be justified in the PR
  description.
- README is updated when structure, scripts or configuration change.

## Governance

This constitution supersedes other practices for this repository. Amendments are made by pull
request that edits this file, states the reason, and updates the version. Versioning follows
semantic rules: MAJOR for removed or redefined principles, MINOR for added principles or materially
expanded guidance, PATCH for wording clarifications. Every PR review verifies compliance, and
unavoidable complexity or deviation MUST be justified in writing in the PR. The README and the
code remain the runtime guidance for day-to-day development.

**Version**: 1.0.0 | **Ratified**: 2026-10-08 | **Last Amended**: 2026-10-08
