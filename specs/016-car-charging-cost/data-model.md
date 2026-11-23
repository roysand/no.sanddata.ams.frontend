# Data Model: What the Car Charging Costs, on the Bill

## EvChargerBillPart (`features/dashboard/types.ts`, changed)

| Field      | Type                                                  | Notes                                                          |
| ---------- | ----------------------------------------------------- | -------------------------------------------------------------- |
| `cost`     | number \| null                                        | NOK incl. VAT, the hours so far, not rounded; null: not priced |
| `pricedAt` | `'NorgesPrisPrice' \| 'HousePrice' \| string` \| null | null only from an API without spec 019 (research R1)           |

Neither is added to any bill sum (FR-005).
