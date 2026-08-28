export interface LoginResponse {
  accessToken: string
  refreshToken: string
  email: string
  roles: string[]
  accessTokenExpiry: string
  refreshTokenExpiry: string
}

export interface MeResponse {
  email: string
  roles: string[]
}

export interface RegisterResponse {
  id: string
  firstName: string
  lastName: string
  email: string
  isActive: boolean
  roles: string[]
  locations: string[]
}
