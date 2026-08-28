import { authStore } from './authStore'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:7130'

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

interface RequestOptions {
  auth?: boolean
}

interface RefreshTokenResponse {
  accessToken: string
  refreshToken: string
  accessTokenExpiry: string
  refreshTokenExpiry: string
}

let refreshPromise: Promise<string | null> | null = null

export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = authStore.getSession()?.refreshToken ?? authStore.getStoredRefreshToken()
  if (!refreshToken) return null

  const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })

  if (!response.ok) {
    authStore.clearSession()
    return null
  }

  const data: RefreshTokenResponse = await response.json()
  const current = authStore.getSession()
  authStore.setSession({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    email: current?.email ?? '',
    roles: current?.roles ?? [],
  })
  return data.accessToken
}

async function request<T>(
  path: string,
  init: RequestInit,
  options: RequestOptions = {},
): Promise<T> {
  const { auth = true } = options
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')

  if (auth) {
    const accessToken = authStore.getSession()?.accessToken
    if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)
  }

  let response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers })

  if (response.status === 401 && auth) {
    refreshPromise ??= refreshAccessToken().finally(() => {
      refreshPromise = null
    })
    const newAccessToken = await refreshPromise

    if (newAccessToken) {
      headers.set('Authorization', `Bearer ${newAccessToken}`)
      response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers })
    }
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new ApiError(
      response.status,
      body?.code ?? 'Unknown',
      body?.message ?? response.statusText,
    )
  }

  if (response.status === 204) return undefined as T

  return response.json() as Promise<T>
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { method: 'GET' }, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }, options),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }, options),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { method: 'DELETE' }, options),
}
