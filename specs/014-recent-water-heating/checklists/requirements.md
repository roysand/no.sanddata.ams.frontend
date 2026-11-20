# Specification Quality Checklist: Water Heating in the "Last 3 Hours" Chart

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-11-20
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- The spec names the backend spec (API 017) as its data source, as specs 010 and 013 do. No endpoint path, field
  name or code appears in the requirements; the plan maps them to the contract.
- User Story 2 (steps on whole 5 minutes) came out of reading the card: it starts its window on the minute, so its
  steps were up to 4 minutes off from the heater's. It changes the chart's labels for every location (17:35 instead of
  17:37), which is the only visible change for a location without a heater.
- Choices made without asking, recorded as assumptions:
  - Yesterday's line stays a total.
  - The heater is never drawn above the house's line.
  - The 3-hour share line is P2.
  - "Partly measured" uses spec 010's margin.
- Out of scope: the car charger (no live data), and yesterday's water heating.
