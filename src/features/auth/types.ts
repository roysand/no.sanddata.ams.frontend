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
