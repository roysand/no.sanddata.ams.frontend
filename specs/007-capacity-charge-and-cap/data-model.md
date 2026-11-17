# Data Model: Show the Capacity Charge, the Norgespris Monthly Limit and the Exemptions

UI types only; the API owns the data. Field names follow the API contract
([contracts/api-usage.md](contracts/api-usage.md)).

## Dashboard slice (`src/features/dashboard/types.ts`)

### CapSplit (new)

| Field | Type | Notes |
|---|---|---|
| `kwhWithinCap` | number | kWh of the hour priced on Norgespris terms; 0 when the whole hour is above the limit |
| `kwhAboveCap` | number | kWh priced on spot terms because the monthly limit is reached |
| `aboveCapParts` | `PriceParts` | The parts of one kWh above the limit |

`CurrentRateCost` and `HourRateCost` gain `cap?: CapSplit | null` (absent on an older API, null when nothing is above
the limit). The existing `parts` are then the within-limit parts, and `ratePerKwh` is the blended rate.

### CapacityCharge (new)

| Field | Type | Notes |
|---|---|---|
| `month` | string | `yyyy-MM` |
| `provisional` | boolean | true for the current month |
| `set` | boolean | false: no tariff, no step table for the month, or no consumption; the figures below are null |
| `peaks` | `CapacityPeak[]` | 0 to 3, highest first as sent |
| `averageKw` | number \| null | |
| `step` | `{ lowerKw: number; upperKw: number \| null }` \| null | `upperKw` null for the top step |
| `amountExclVat` | number \| null | kr per month |
| `vat` | number \| null | 0 for a VAT-exempt location |
| `amount` | number \| null | kr per month, including VAT unless exempt |
| `kwToNextStep` | number \| null | null for the top step |

### CapacityPeak (new)

| Field | Type | Notes |
|---|---|---|
| `date` | string | Oslo date `yyyy-MM-dd` |
| `hourStartUtc` | string | ISO UTC; shown as Oslo clock time |
| `kw` | number | |

## Admin slice (`src/features/admin/types.ts`)

### LocationPricing / LocationPricingInput (changed)

Add `electricityTaxExempt`, `vatExempt`, `isHolidayHome` (boolean). On read, a missing flag becomes `false` in
`api.ts`. The input always carries all three.

### PriceRateKind (changed)

Add `'NorgesPrisCapHome' | 'NorgesPrisCapHolidayHome'`. `value` is kWh per month: greater than 0, at most 99 999, at
most 4 decimals.

### CapacityStep, CapacityStepTable, CapacityStepTableInput (new)

| Type | Fields |
|---|---|
| `CapacityStep` | `lowerKw: number`, `upperKw: number \| null`, `monthlyAmount: number` (kr excl. VAT) |
| `CapacityStepTable` | `validFrom: string`, `status: NorgesPrisStatus` (Superseded, InEffect, Upcoming), `steps: CapacityStep[]` |
| `CapacityStepTableInput` | `validFrom`, `steps: CapacityStep[]`, `confirmPastDate: boolean` |

### Step table form (schema, not sent as is)

| Field | Rule |
|---|---|
| `validFrom` | a date; today or earlier needs `confirmPast` |
| `amountsIncludeVat` | boolean; when true each amount is divided by 1,25 and rounded to 4 decimals on submit |
| `rows[]` | 1 to 50 rows of `{ upperKw, amount }`; the last row has no `upperKw` |
| `rows[i].upperKw` | above the row's lower kW (the previous row's upper, 0 for the first), at most 99 999, ≤ 4 decimals |
| `rows[i].amount` | 0 to 99 999, ≤ 4 decimals (after conversion when including VAT) |

Status transitions follow the existing dated-rate rules: Upcoming → In effect when its start date arrives →
Superseded when a newer table starts. Only Upcoming tables can be deleted.
