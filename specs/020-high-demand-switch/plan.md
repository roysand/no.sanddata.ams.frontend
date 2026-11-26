# Implementation Plan: A High Demand Switch on the Heater Tab

**Branch**: `020-high-demand-switch` | **Date**: 2026-11-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/020-high-demand-switch/spec.md`

## Summary

API spec 022 adds `PUT` / `DELETE /api/admin/locations/{id}/water-heater/high-demand` (Admin only) answering
`{ locationId, highDemand, state }`. The app calls them in `setHighDemand(locationId, on)` and a mutation
`useHighDemand(locationId)` that writes the answer's `state` into the heater state's cache, or refetches it when
`state` is null or the outcome is unknown (research R1, R2). A new `HighDemandSwitch` (shadcn `Switch`, from the
`radix-ui` package already installed) sits in the Heater tab's card for Admins only (R3), with the failure texts of
contracts/ui.md (R4). The mode is renamed "High Demand" on the tab (R5).

## Technical Context

**Language/Version**: TypeScript 5 (strict), React 19

**Primary Dependencies**: TanStack Query 5, shadcn/ui; a new `components/ui/switch.tsx` on `radix-ui` (already a
dependency). **No new dependencies.**

**Storage**: none.

**Testing**: Vitest + Testing Library + MSW.

- `api.test.ts`: the two requests.
- `WaterHeaterCard.test.tsx`: the switch for Admins only, on/off from the state, turning on and off updates the card
  from the answer, null state refetches, disabled while switching, each error text, no retry, "High Demand until …".

**Target Platform**: a mobile-first browser SPA, at 375 px, in light and dark mode (SC-004).

**Project Type**: web (frontend SPA against the existing API)

**Constraints**: no retries (the mutation's default, and nothing re-sends); Admin check is UX only (constitution V).

**Scale/Scope**: `api.ts`, `types.ts`, `hooks.ts`, `WaterHeaterCard.tsx`, a new `HighDemandSwitch.tsx`, a new
`components/ui/switch.tsx`, and their tests.

## Constitution Check

| Principle             | How the plan meets it                                                                         | Status |
| --------------------- | --------------------------------------------------------------------------------------------- | ------ |
| I. Feature slices     | All in `features/dashboard`, beside the heater card; the switch primitive in `components/ui`. | ✅     |
| II. One gateway       | `setHighDemand` through `api.put` / `api.delete`; errors as `ApiError` with their codes.      | ✅     |
| III. TanStack Query   | A mutation that sets or invalidates `['water-heater', 'state', id]`; no copied server state.  | ✅     |
| IV. Forms             | No forms.                                                                                     | ✅ n/a |
| V. Session safety     | The Admin check hides the switch only; the API answers 403 to others.                         | ✅     |
| VI. Typed, lint-clean | shadcn `Switch` on the existing `radix-ui` package; typed answer.                             | ✅     |
| VII. Tests            | Every state and error through MSW.                                                            | ✅     |

**Re-check after Phase 1**: unchanged, all pass.

## Project Structure

```text
src/
├── components/ui/switch.tsx                  # shadcn Switch (radix-ui)
└── features/dashboard/
    ├── types.ts, api.ts, hooks.ts            # HighDemandAnswer, setHighDemand, useHighDemand
    ├── HighDemandSwitch.tsx                  # the switch, its texts and errors
    └── WaterHeaterCard.tsx (+ test)          # the switch for Admins; "High Demand" naming
```

## Complexity Tracking

None.
