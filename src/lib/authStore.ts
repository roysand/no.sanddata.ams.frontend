export interface AuthSession {
  accessToken: string
  refreshToken: string
  email: string
  roles: string[]
}

type Listener = () => void

const REFRESH_TOKEN_KEY = 'ams.refreshToken'

let session: AuthSession | null = null
const listeners = new Set<Listener>()

function notify() {
  for (const listener of listeners) listener()
}

export const authStore = {
  getSession(): AuthSession | null {
    return session
  },

  setSession(next: AuthSession) {
    session = next
    localStorage.setItem(REFRESH_TOKEN_KEY, next.refreshToken)
    notify()
  },

  clearSession() {
    session = null
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    notify()
  },

  getStoredRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  },

  subscribe(listener: Listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}
