# Data Model: Show the Bill for the Month, Estimated and Final

Client-side types only; the API is the source of truth (API spec 010 `data-model.md`). Nothing is stored in the
browser.

## dashboard/types.ts (new)

```ts
export type BillStatus = 'Estimate' | 'Final'
export type BillLineCode =
  | 'SupplierMonthlyFee'
  | 'SpotEnergy'
  | 'SupplierMarkup'
  | 'GridEnergyDay'
  | 'GridEnergyNight'
  | 'CapacityCharge'
  | 'ElectricityTax'
  | 'EnovaFee'
  | 'NorgesPrisCredit'

export interface BillAmounts {
  soFar: number
  projected: number
  amount: number
  amountExclVat: number
  vat: number
}

export interface BillLine {
  code: BillLineCode | string // unknown codes are shown, not dropped (research R5)
  unit: 'kWh' | 'Month'
  quantity: number
  unitPrice: number | null // kr per unit incl. VAT; null when not set or quantity 0
  vatRate: number // fraction, 0.25 or 0
  set: boolean
  complete: boolean
  soFar: number | null
  projected: number | null
  amount: number | null
  amountExclVat: number | null
  vat: number | null
}

export interface BillPart extends BillAmounts {
  name: 'Strom' | 'Nettleie'
  lines: BillLine[]
}

export interface BillProjection {
  fromUtc: string
  hours: number
  kwh: number
  basedOnHours: number
  basedOnDays: number
  assumedSpotPricePerKwh: number | null
}

export interface MonthlyBill {
  month: string // yyyy-MM
  status: BillStatus
  pricingModel: PricingModel // existing type: 'Spot' | 'NorgesPris'
  isComplete: boolean
  hours: { inMonth: number; passed: number; withReadings: number; priced: number }
  projection: BillProjection | null // null when Final
  capacity: {
    provisional: boolean
    averageKw: number | null
    step: { lowerKw: number; upperKw: number | null } | null
  }
  strom: BillPart
  nettleie: BillPart
  total: BillAmounts
}
```

Rules the views rely on (from the API contract): `amount = soFar + projected = amountExclVat + vat` for every line,
part and total; `Final` ⇒ `projection` null and every `projected` 0; a line with `set: false` has null amounts and is
not in the sums.

## dashboard/bill.ts (new, pure helpers, unit-tested)

| Helper                                 | Returns                                                                                                        |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `lineName(code)` / `invoiceName(code)` | English name / Norwegian invoice name (research R5)                                                            |
| `formatQuantity(line)`                 | `240,31 kWh` or `1 month`                                                                                      |
| `formatUnitPrice(line)`                | `155,52 øre/kWh`, `34,00 kr/month`, or null when not set                                                       |
| `formatVatRate(rate)`                  | `25 %`, `0 %`                                                                                                  |
| `basisText(projection)`                | "Estimated from the last 7 days of use", "Based on 2 days of use, so uncertain", "No use yet to estimate from" |
| `incompleteReasons(bill)`              | list of reason strings (research R8)                                                                           |
| `isVatExemptBill(bill)`                | research R9                                                                                                    |
| `hasReadings(bill)`                    | `hours.withReadings > 0`                                                                                       |

`basedOnDays` is rounded to whole days for display; below 7 counts as uncertain (FR-003).

## admin/types.ts (changed)

```ts
interface LocationPricing {
  // …existing fields
  supplierMonthlyFee: number | null // NOK per month excl. VAT; null = not set
}
interface LocationPricingInput {
  // …existing fields
  supplierMonthlyFee?: number // omitted keeps the stored value
}
```

`isComplete` keeps coming from the server; it is now true only with a grid tariff and a fee.

## admin/schema.ts (changed)

`locationPricingSchema` gains `supplierMonthlyFee: optionalAmountField('Monthly fee', 10_000)`: empty string
allowed; otherwise a number 0–10 000 with at most four decimals. Mirrors `Validation.InvalidMonthlyFee` on the API.

## Query keys

| Key                                        | Used by                        | Refresh                                                                                       |
| ------------------------------------------ | ------------------------------ | --------------------------------------------------------------------------------------------- |
| `['cost', 'bill', locationId, month]`      | `ExpectedBillCard`, `BillCard` | 15 min for the current month, none otherwise                                                  |
| `['admin', 'location-pricing']` (existing) | pricing page and dialog        | invalidated by the save; the save also invalidates `['cost']` as today, so open bills refetch |
