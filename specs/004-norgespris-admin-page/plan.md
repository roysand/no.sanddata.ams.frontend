# Implementation Plan: Admin Page for Norgespris Rates

**Branch**: `004-norgespris-admin-page` | **Date**: 2026-11-13 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-norgespris-admin-page/spec.md`. Backend contract: `no.sanddata.ams.api` `specs/007-norgespris-rates/contracts/endpoints.md` (PR #21).

## Summary

One new Admin page in the existing `admin` slice: a table of the Norgespris rates (the one in effect highlighted), an
add dialog with a recalculation warning and a required confirmation for start dates of today or earlier, and a delete
dialog for upcoming rates. Reads and writes go through `api.get/post/delete` and TanStack Query hooks; the form is React
Hook Form with a Zod schema built for "today in Norway".

## Technical Context

**Language/Version**: TypeScript (strict), React 19, Vite, Node 22+

**Primary Dependencies**: React Router 7, TanStack Query 5, React Hook Form + Zod, shadcn/ui (Radix), Tailwind 4. No new dependency.

**Storage**: none (server state in the Query cache only)

**Testing**: Vitest + React Testing Library + user-event + MSW, as in `features/admin/UsersPage.test.tsx`

**Target Platform**: browser, mobile first like the other admin pages

**Constraints**: Oslo date decides "today" (`lastOsloDays` in `features/dashboard/format.ts`, named in the constitution as the shared helper); the API stays the authority.

## Constitution Check

| Principle | Status |
|---|---|
| I. Feature-sliced | Pass. All new files are in `src/features/admin/`; shared routing/menu edits in `app/routes.tsx` and `components/MenuPanel.tsx`. The only cross-slice import is the Oslo date helper that the constitution names as the shared one. |
| II. One gateway | Pass. `api.get/post/delete` from `lib/apiClient.ts`; failures surface as `ApiError`. |
| III. Query | Pass. Hooks in `hooks.ts` with the hierarchical key `['admin', 'norgespris']`; mutations invalidate it and the cost keys (`cost`, `prices`). |
| IV. Validated forms | Pass. RHF + Zod in `schema.ts`; the rules that mirror the API are commented as such. |
| V. Session and access | Pass. Page under `AdminRoute`; the menu entry is shown to Admins only; UI roles are UX, the API enforces. |
| VI. Typed, lint-clean | Pass. No `any`; shadcn primitives only. |
| VII. Tests | Pass. Vitest/RTL/MSW tests beside the code for the schema, page, dialogs and menu. |

No deviations.

## Project Structure

```text
src/
├── app/routes.tsx                         # CHANGED: /admin/norgespris under AdminRoute
├── components/
│   ├── MenuPanel.tsx                      # CHANGED: "Norgespris" under Administration
│   └── Header.test.tsx / MenuPanel tests  # CHANGED: the new entry
└── features/admin/
    ├── types.ts                           # CHANGED: NorgesPrisRate, NorgesPrisStatus, NorgesPrisRateInput
    ├── api.ts                             # CHANGED: getNorgesPrisRates, addNorgesPrisRate, deleteNorgesPrisRate
    ├── hooks.ts                           # CHANGED: useNorgesPrisRates, useNorgesPrisActions
    ├── schema.ts                          # CHANGED: createNorgesPrisRateSchema(today)
    ├── norgesPris.ts                      # NEW: formatting (date, amount) and amount parsing
    ├── NorgesPrisPage.tsx                 # NEW
    ├── AddNorgesPrisRateDialog.tsx        # NEW
    ├── DeleteNorgesPrisRateDialog.tsx     # NEW
    └── *.test.ts(x)                       # NEW: schema, formatting, page, dialogs
README.md                                  # CHANGED: mention the page in the admin slice line
```

## Design notes

- **Form values are strings** (`validFrom`, `ratePerKwh`, `taxPerKwh`, `confirmPast`). The schema parses amounts with a
  comma or a dot, enforces 0..100 and at most four decimals (same rules as the API validator), and, when
  `validFrom <= today (Oslo)`, requires `confirmPast`. On submit the amounts become numbers and `confirmPast` becomes
  `confirmPastDate`.
- **"Today"** is passed into the schema factory (`createNorgesPrisRateSchema(today)`), computed with
  `lastOsloDays(new Date(), 1)[0]`, so tests can fix it.
- **Query invalidation** after add and delete: `['admin', 'norgespris']`, `['cost']` and `['prices']`, so the dashboard
  never shows figures from before the change.
- **Error messages**: shown as `ApiError.message`; the page does not depend on the error code (the API does not send it).
