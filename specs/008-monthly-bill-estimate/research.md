# Research: Show the Bill for the Month, Estimated and Final

No open questions came out of the Technical Context; the decisions below settle how the spec maps onto the code.

## R1. One bill view, two places

- **Decision**: One `BillView` component renders a `MonthlyBill` (parts, lines, totals, incomplete note). The
  dashboard's `ExpectedBillCard` wraps it for the current month with the summary on top and the parts closed; the
  History page's `BillCard` wraps it with month navigation and the invoice columns (quantity, unit price, VAT rate,
  amount, excl. VAT / VAT per part). Both live in `features/dashboard` (HistoryPage is already there).
- **Rationale**: One place decides line names, order, "Not set" and signs, so the two views cannot disagree (SC-004).
- **Alternatives**: Two separate components (duplicated rules); a new `bill` slice (the History page and dashboard
  would import across slices, against Principle I).

## R2. Query and refresh

- **Decision**: `useMonthlyBill(locationId, month, isCurrent)` with key `['cost', 'bill', locationId, month]`,
  `enabled: !!locationId`, `refetchInterval: isCurrent ? 15 min : false`, like `useCapacityCharge`. Both views use the
  same key for the current month, so the dashboard and History share one cache entry. `retry` stays the app default
  (1, as for capacity). The key starts with `['cost']`, so every admin pricing change (`useRefreshAfterPricingChange`
  in `admin/hooks.ts`) already refetches open bills; no new invalidation is needed.
- **Rationale**: Readings arrive per hour, and the capacity card already refreshes every 15 minutes (FR-006). A
  finished month never changes unless pricing settings change.
- **Alternatives**: 1-minute refresh (wasted calls for a figure that moves per hour).

## R3. Rounding and sums

- **Decision**: Show the server's line, part and total amounts rounded for display only; never add lines in the
  browser. Lines with `set: false` are already left out of the server's sums.
- **Rationale**: Contract: "All amounts are NOK, full precision (the client rounds)"; SC-004.

## R4. Number formats

- **Decision**: New helpers in `features/dashboard/bill.ts`, built on the existing `nb-NO` formatters in `format.ts`:
  kr with `formatNok` (two decimals, `kr` suffix); kWh with two fixed decimals (the existing `formatKwh` drops
  trailing zeros, so a `formatKwh2` with `minimumFractionDigits: 2` is added); unit price for kWh lines as øre/kWh =
  `unitPrice × 100` with two decimals, monthly lines as kr per month; VAT as `25 %` / `0 %`
  (`Math.round(vatRate × 100)`).
- **Rationale**: Matches the invoice (155,52 øre/kWh, 34,00 kr/month), FR-010, FR-023.

## R5. Line names and order

- **Decision**: A fixed map from `code` to an English name and the invoice's Norwegian name:

  | Code                 | Name                             | Invoice name         |
  | -------------------- | -------------------------------- | -------------------- |
  | `SupplierMonthlyFee` | Monthly fee                      | Månedlig fastbeløp   |
  | `SpotEnergy`         | Energy at spot price             | Din strømpris        |
  | `SupplierMarkup`     | Markup                           | Påslag               |
  | `GridEnergyDay`      | Grid energy, weekdays 06–22      | Energiledd dag       |
  | `GridEnergyNight`    | Grid energy, nights and weekends | Energiledd natt/helg |
  | `CapacityCharge`     | Capacity charge                  | Fastledd             |
  | `ElectricityTax`     | Electricity tax                  | Elavgift             |
  | `EnovaFee`           | Enova fee                        | Energifondet         |
  | `NorgesPrisCredit`   | Norgespris credit                | Norgespris           |

  Lines are shown in the order the server sends them (the contract fixes it); an unknown code is shown with its code
  as the name rather than dropped, so a new server line never disappears.

- **Rationale**: FR-009; the invoice names help the comparison (spec assumption).

## R6. Expand and collapse

- **Decision**: Native `<details>`/`<summary>` for the Strøm and Nettleie parts on the card, styled with Tailwind.
- **Rationale**: Keyboard and screen-reader support out of the box, no new dependency (there is no Collapsible or
  Accordion in `components/ui`). Testing Library can open it with `user.click(summary)`.
- **Alternatives**: Add shadcn Collapsible (new Radix package, needs justification for little gain).

## R7. Where stepping back stops

- **Decision**: On History, the previous-month button is disabled when the shown bill has `hours.withReadings === 0`
  (and while it is loading). The view then says "No readings in <month>" instead of the lines.
- **Rationale**: The app has no first-reading date (spec assumption, FR-008). The server answers a month before the
  first reading with 200 and zero hours.

## R8. Incomplete reasons

- **Decision**: `incompleteReasons(bill)` returns the list shown under "Incomplete": the names of lines with
  `set: false` ("Monthly fee not set"), the names of lines with `set: true, complete: false` ("Energy at spot price may
  be too low: some hours have no price"), and "N hours with readings could not be priced" when
  `hours.priced < hours.withReadings`. Admin link and "Ask an administrator" follow `CapacityCard`'s `NotSet` pattern
  (`useAuth().roles.includes('Admin')`, link to `/admin/location-pricing`).
- **Rationale**: FR-014 to FR-016; unit-testable without rendering.

## R9. The VAT-exempt case

- **Decision**: A bill is treated as VAT-exempt when every set line has `vatRate === 0` and the bill has a line other
  than the Norgespris credit. Then the "including VAT" labels are dropped.
- **Rationale**: The bill has no exemption flag; the credit always has 0 % VAT, so it must not decide it.

## R10. Supplier monthly fee in the admin form

- **Decision**: Add `supplierMonthlyFee: number | null` to `LocationPricing` (normalized to `null` in `api.ts` when an
  older API omits it) and optional `supplierMonthlyFee?: number` to `LocationPricingInput`. The Zod schema gets an
  optional amount field: empty allowed, otherwise 0–10 000 with at most four decimals (the API validator allows four), using the shared
  `parseAmount` (comma or point). An empty field is omitted from the PUT, which keeps the stored value (contract). A
  400 `Validation.InvalidMonthlyFee` is shown under the field; other errors stay in the dialog's general message.
- **Rationale**: FR-017 to FR-019, Principle IV (rule mirrors the API and is commented as such).
- **Consequence**: An administrator cannot clear a fee back to "not set" from the UI, because the API has no way to
  do that; they set 0 instead. The dialog's help text says so.

## R11. Wording changes

- **Decision**: Append "The expected bill on the Now tab includes them." (or the History-specific variant) to the
  notes in `NowCard`, `UsageChart`, `PriceBreakdownDialog` and `ExportCard`; change the markup help text in
  `EditLocationPricingDialog` to "Added to every kWh, also under Norgespris." and the `LocationPricing` type comment.
  Existing tests that assert the old texts are updated.
