export interface AdminUser {
  id: string
  firstName: string
  lastName: string
  email: string
  isActive: boolean
  roles: string[]
  /** Location names, for display */
  locations: string[]
  /** Location ids, for linking and unlinking */
  locationIds: string[]
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
