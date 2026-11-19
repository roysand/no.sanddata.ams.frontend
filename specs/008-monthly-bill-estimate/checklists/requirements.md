# Specification Quality Checklist: Show the Bill for the Month, Estimated and Final

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-11-19
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

- The spec names the backend spec and its contract in **Input** and **Assumptions** as the dependency, as earlier
  frontend specs do; field names appear only in independent tests (`set: false`, `isComplete: false`), where they
  define the test data.
- Choices made without asking (listed in Assumptions): the History bill opens on the previous month; stepping back
  stops at the first month without readings, because the app has no "first reading" date; the electricity tax and
  the Enova fee are one line each; shown subtotals come from the server, not from adding rounded lines.

## Implementation checks (2026-11-19)

- `npm test`: 66 files, 582 tests pass (57 new: bill helpers, the two bill cards, the admin fee field and schema, the
  note texts). `npm run build` passes. `npm run lint`: 0 errors, the 4 warnings that were there before.
- The July 2026 reference invoice renders line by line with the invoice's quantities, prices, VAT rates and amounts,
  and the totals 417,33 / 256,22 / 673,55 kr (`BillCard.test.tsx`, test bill in `src/test/bills.ts`).
- Change from the spec while implementing: the monthly fee allows four decimals, not two, because the API validator
  (`Validation.InvalidMonthlyFee`) allows four; spec FR-017 and the plan documents were updated.
- Not done yet: the phone-width check (T032) and the check against the running API as Admin (T033); both need the
  app signed in against the API.
