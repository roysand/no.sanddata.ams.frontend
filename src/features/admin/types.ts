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
