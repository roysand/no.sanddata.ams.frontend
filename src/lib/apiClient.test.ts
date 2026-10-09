import { http, HttpResponse } from 'msw'
import { server } from '../test/server'
import { refreshAccessToken } from './apiClient'
import { authStore } from './authStore'

describe('refreshAccessToken', () => {
  afterEach(() => authStore.clearSession())

  it('sends one request when called twice at the same time, so the rotated token is not reused', async () => {
    authStore.setSession({
      accessToken: 'old',
      refreshToken: 'refresh-1',
      email: 'a@b.no',
      roles: ['User'],
    })
    const used: string[] = []
    server.use(
      http.post('*/api/auth/refresh', async ({ request }) => {
        const body = (await request.json()) as { refreshToken: string }
        used.push(body.refreshToken)
        // The API rotates tokens: a token that was already used is rejected.
        if (used.length > 1) return HttpResponse.json({ message: 'revoked' }, { status: 401 })
        return HttpResponse.json({
          accessToken: 'new',
          refreshToken: 'refresh-2',
          accessTokenExpiry: '',
          refreshTokenExpiry: '',
        })
      }),
    )

    const [first, second] = await Promise.all([refreshAccessToken(), refreshAccessToken()])

    expect(used).toEqual(['refresh-1'])
    expect(first).toBe('new')
    expect(second).toBe('new')
    expect(authStore.getSession()?.refreshToken).toBe('refresh-2')
  })
})
