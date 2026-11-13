import { createContext, useContext } from 'react'

export type ThemePreference = 'system' | 'light' | 'dark'

export interface ThemeContextValue {
  /** What the user chose; "system" follows the device. */
  preference: ThemePreference
  /** What is actually shown right now. */
  resolved: 'light' | 'dark'
  setPreference: (preference: ThemePreference) => void
  /** system -> light -> dark -> system */
  cycle: () => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
