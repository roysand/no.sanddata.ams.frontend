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
