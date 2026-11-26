# Tasks: A High Demand Switch on the Heater Tab

**Input**: Design documents from `/specs/020-high-demand-switch/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md) (R1–R5),
[data-model.md](data-model.md), [contracts/ui.md](contracts/ui.md), [quickstart.md](quickstart.md)

**Tests**: Included (constitution VII): Vitest, Testing Library and MSW.

## Facts from the code that the tasks rely on

- `src/features/dashboard/WaterHeaterCard.tsx`: `MODE_LABEL` (`Supercharge: 'Supercharge'`), the badge, and
  `HeaterFigures` with the status line and "{mode} until {formatOsloDateTime(end)}".
- `src/features/dashboard/hooks.ts`: `useWaterHeaterState` with key `['water-heater', 'state', locationId]`.
- `src/lib/apiClient.ts`: `api.put`, `api.delete`, `ApiError` with `status` and `code`.
- `src/features/auth/useAuth`: `roles`.
- `radix-ui` exports `Switch`; there is no `components/ui/switch.tsx` yet.

## Phase 2: Foundational

- [x] T001 [P] Add the shadcn `Switch` in src/components/ui/switch.tsx on `radix-ui`'s `Switch`
- [x] T002 Add `HighDemandAnswer` in src/features/dashboard/types.ts and `setHighDemand(locationId, on)` (PUT on / DELETE off) in src/features/dashboard/api.ts, with a test of both requests in src/features/dashboard/api.test.ts
- [x] T003 Add `useHighDemand(locationId)` in src/features/dashboard/hooks.ts per research R2 (`retry: 0`; set the state from the answer, invalidate on a null state or a 503)

## Phase 3: User Stories 1 and 2 – switch it, Admins only (P1) 🎯 MVP

- [x] T004 [US1] Create src/features/dashboard/HighDemandSwitch.tsx per research R3 and contracts/ui.md
- [x] T005 [US1] [US2] Render it in `HeaterFigures` below the status line for Admins only, in src/features/dashboard/WaterHeaterCard.tsx
- [x] T006 [US1] Rename the mode "High Demand" (`MODE_LABEL`) in src/features/dashboard/WaterHeaterCard.tsx, and update the existing tests that say "Supercharge"
- [x] T007 [US1] [US2] Tests in src/features/dashboard/WaterHeaterCard.test.tsx: no switch for a non-Admin; off/on from the state; turning on sends PUT and shows "High Demand until …" from the answer; off sends DELETE; a null state reads the state again; "Switching…" and disabled while pending

## Phase 4: User Story 3 – failures (P1)

- [x] T008 [US3] The failure texts of research R4 in src/features/dashboard/HighDemandSwitch.tsx
- [x] T009 [US3] Tests in src/features/dashboard/WaterHeaterCard.test.tsx: 503 shows its text and reads the state again, with exactly one PUT (no retry); `HighDemandNotOffered` disables the switch; `Rejected` shows the reconnect text; another error shows the API's message

## Phase 5: Polish

- [x] T010 `npm run lint`, `npm test`, `npm run build` pass; `prettier --check` on the changed files only
- [x] T011 Look at the card with the switch at 375 px in light and dark mode, off and on (headless screenshot; harness not committed; the failure texts are covered by tests)
- [x] T012 Remove `specs/_backlog/oso-high-demand-frontend.md` from the API repository in its own small PR (a separate worktree): API PR #81
- [ ] T013 Run quickstart.md's checks by hand against production (Roy)
