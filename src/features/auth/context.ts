import { createContext } from 'react'

export interface AuthContextValue {
  isAuthenticated: boolean
  isLoading: boolean
  email: string | null
  roles: string[]
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
