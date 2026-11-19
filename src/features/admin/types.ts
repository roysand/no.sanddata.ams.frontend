import type { LocationRole } from '../locations'

export interface AdminUser {
  id: string
  firstName: string
  lastName: string
  email: string
  isActive: boolean
  roles: string[]
  /** The user's locations with their role there (the API also sends `locations` and `locationIds`; unused). */
  locationAccess: UserLocationAccess[]
}

export interface UserLocationAccess {
  locationId: string
  name: string
  role: LocationRole
}

export interface PagedUsers {
  users: AdminUser[]
  totalCount: number
  pageNumber: number
  pageSize: number
  totalPages: number
}

export interface CreateUserInput {
  firstName: string
  lastName: string
  email: string
  password: string
}

/** Computed by the server from today's date in Norway. */
export type NorgesPrisStatus = 'Superseded' | 'InEffect' | 'Upcoming'

/** A Norgespris (government flat price) rate, valid from `validFrom` until a later-dated rate takes over. */
export interface NorgesPrisRate {
  id: string
  /** First Norwegian calendar day the rate applies to, `yyyy-MM-dd`. */
  validFrom: string
  ratePerKwh: number
  taxPerKwh: number
  totalPerKwh: number
  status: NorgesPrisStatus
}

export interface NorgesPrisRateInput {
  validFrom: string
  ratePerKwh: number
  taxPerKwh: number
  /** Must be true for a start date of today or earlier: the caller accepts that past costs are recalculated. */
  confirmPastDate: boolean
}

/** One location with its grid tariff and supplier markup. No tariff means the grid part of its prices is left out. */
export interface LocationPricing {
  locationId: string
  name: string
  gridTariffId: string | null
  gridTariffName: string | null
  /** NOK per kWh excluding VAT, added to every kWh, also under Norgespris. */
  supplierMarkupPerKwh: number
  /** The supplier's fee in NOK per month excluding VAT; null = not set (the bill's fee line is "not set"). */
  supplierMonthlyFee: number | null
  /** True only when both a grid tariff and the supplier monthly fee are set. */
  isComplete: boolean
  /** No electricity tax; the Enova fee still applies. */
  electricityTaxExempt: boolean
  /** No VAT on any part of the price. */
  vatExempt: boolean
  /** A holiday home has a lower Norgespris monthly limit (1 000 kWh instead of 5 000). */
  isHolidayHome: boolean
}

export interface LocationPricingInput {
  gridTariffId: string | null
  supplierMarkupPerKwh: number
  /** NOK per month excluding VAT. Omitted keeps the stored value; the API cannot clear it back to not set. */
  supplierMonthlyFee?: number
  electricityTaxExempt: boolean
  vatExempt: boolean
  isHolidayHome: boolean
}

/** A rate of a grid tariff in NOK per kWh excluding taxes and VAT, valid from `validFrom`. */
export interface GridTariffRate {
  id: string
  validFrom: string
  dayRatePerKwh: number
  nightRatePerKwh: number
  status: NorgesPrisStatus
}

export interface GridTariff {
  id: string
  name: string
  rates: GridTariffRate[]
}

export interface GridTariffRateInput {
  validFrom: string
  dayRatePerKwh: number
  nightRatePerKwh: number
  confirmPastDate: boolean
}

export type PriceRateKind =
  'ElectricityTax' | 'EnovaFee' | 'Vat' | 'NorgesPrisCapHome' | 'NorgesPrisCapHolidayHome'

/**
 * A national value with a start date: the two fees in NOK per kWh, VAT as a fraction (0.25 is 25 percent), the two
 * Norgespris monthly limits in kWh per month.
 */
export interface PriceRate {
  id: string
  kind: PriceRateKind
  validFrom: string
  value: number
  status: NorgesPrisStatus
}

export interface PriceRateInput {
  kind: PriceRateKind
  validFrom: string
  value: number
  confirmPastDate: boolean
}

/** One step of a capacity table: an average peak from `lowerKw` up to `upperKw` (open for the top step). */
export interface CapacityStep {
  lowerKw: number
  upperKw: number | null
  /** NOK per month excluding VAT. */
  monthlyAmount: number
}

/** A grid tariff's capacity steps from `validFrom`, added and deleted as a whole. */
export interface CapacityStepTable {
  validFrom: string
  status: NorgesPrisStatus
  steps: CapacityStep[]
}

export interface CapacityStepTableInput {
  validFrom: string
  steps: CapacityStep[]
  confirmPastDate: boolean
}
