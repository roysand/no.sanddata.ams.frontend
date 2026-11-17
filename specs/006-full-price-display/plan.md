# Implementation Plan: Show the Full Price, Its Parts and the Norgespris Saving

**Branch**: `006-full-price-display` | **Date**: 2026-11-16 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/006-full-price-display/spec.md`. Backend contract: `no.sanddata.ams.api` `specs/008-full-electricity-price/contracts/endpoints.md` (PR #23).

## Summary

Labels in the dashboard say that prices include VAT, the grid charge and taxes. The right-now card gets a "What is in the price" dialog built from the new `parts` of the current-hour response. A new saving card shows what Norgespris saves for four periods, from a new endpoint. All inside the existing `dashboard` slice; nothing is recomputed in the browser.

## Technical Context

**Language/Version**: TypeScript (strict), React 19, Vite, Node 22+

**Primary Dependencies**: TanStack Query 5, shadcn/ui (Dialog, Card, Table, Skeleton), Tailwind 4. No new dependency.

**Testing**: Vitest + React Testing Library + user-event + MSW, as in `features/dashboard/NowCard.test.tsx`

**Constraints**: the API is the authority; the response may lack `parts` (older API), which must not break the card.

## Constitution Check

| Principle | Status |
|---|---|
| I. Feature-sliced | Pass. New files in `src/features/dashboard/`. One import from another slice: `useAuth` from `features/auth/useAuth`, the same way `admin/UsersPage.tsx` does, to show the Admin link. |
| II. One gateway | Pass. `api.get` in `dashboard/api.ts`. |
| III. Query | Pass. Hook in `hooks.ts`, key `['cost', 'saving', locationId]` so the pricing-data pages (feature 005) invalidate it with the other cost queries. |
| IV. Validated forms | Not applicable (no form). |
| V. Session and access | Pass. The Admin link is UX only; the route is under `AdminRoute`. |
| VI. Typed, lint-clean | Pass. |
| VII. Tests | Pass. Vitest/RTL/MSW; existing dashboard tests updated where labels change. |

No deviations.

## Project Structure

```text
src/features/dashboard/
├── types.ts                    # CHANGED: PriceParts, optional parts on CurrentRateCost and HourRateCost, saving types
├── api.ts / hooks.ts           # CHANGED: getNorgesPrisSaving, useNorgesPrisSaving
├── format.ts                   # CHANGED: formatKrPerKwh (2-4 decimals), formatSaving
├── PriceBreakdownDialog.tsx    # NEW
├── SavingCard.tsx              # NEW
├── NowCard.tsx                 # CHANGED: note, "What is in the price" button
├── PriceTimeline.tsx           # CHANGED: unit label incl. VAT
├── RecentUsage.tsx             # CHANGED: cost label incl. VAT
├── UsageChart.tsx              # CHANGED: note in cost mode
├── DashboardPage.tsx           # CHANGED: the saving card
└── *.test.ts(x)                # NEW and CHANGED
README.md                       # CHANGED: dashboard slice line
```

## Design notes

- **`parts` is optional in the types** so an older API (without it) shows no button instead of failing; the field is required by the contract once PR #23 is deployed.
- **The saving card** takes `hasNorgesPriceAgreement` from the selected location to choose its title; the figures are the API's.
- **Formatting a saving**: positive reads "Saved 12,30 kr", negative reads "Extra cost 4,50 kr" (absolute value), zero reads "No difference".
- **Query keys** start with `cost`, so the Admin pages (feature 005) that invalidate `['cost']` also refresh the saving.
- **Tests**: MSW handlers for `/api/electricity-cost/saving` are added to every existing test that renders the dashboard page, because the test server errors on unhandled requests.
