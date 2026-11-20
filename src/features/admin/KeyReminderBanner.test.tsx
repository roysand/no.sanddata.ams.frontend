import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext, type AuthContextValue } from '../auth/context'
import { renderWithQuery } from '../../test/render'
import { server } from '../../test/server'
import { KeyReminderBanner } from './KeyReminderBanner'
import type { KeyReminder, KeyReminders } from './types'

const auth = (roles: string[]): AuthContextValue => ({
  isAuthenticated: true,
  isLoading: false,
  email: 'someone@sanddata.no',
  roles,
  login: async () => {},
  logout: () => {},
})

const item = (patch: Partial<KeyReminder>): KeyReminder => ({
  locationId: 'cabin',
  locationName: 'Hytta',
  kind: 'SensorKey',
  expiresOn: '2026-12-02',
  expiresAt: '2026-12-02T09:14:03Z',
  daysLeft: 12,
  expired: false,
  ...patch,
})

const list = (items: KeyReminder[]): KeyReminders => ({
  today: '2026-11-20',
  windowDays: 30,
  items,
})

/** Serves the reminder list (or `answer`) and counts the requests. */
function renderBanner(roles: string[], answer: KeyReminders | Response = list([])) {
  const requests = { count: 0 }
  server.use(
    http.get('*/api/admin/key-reminders', () => {
      requests.count++
      return answer instanceof Response ? answer : HttpResponse.json(answer)
    }),
  )
  renderWithQuery(
    <AuthContext.Provider value={auth(roles)}>
      <MemoryRouter>
        <KeyReminderBanner />
      </MemoryRouter>
    </AuthContext.Provider>,
  )
  return requests
}

const region = () => screen.queryByRole('region', { name: 'Keys that expire soon' })

describe('KeyReminderBanner', () => {
  it('lists the due keys for an administrator, soonest first, each linking to the location', async () => {
    renderBanner(
      ['Admin'],
      list([
        item({
          locationId: 'home',
          locationName: 'Hjemme',
          kind: 'WaterHeaterKey',
          expiresAt: null,
          daysLeft: 3,
        }),
        item({}),
      ]),
    )

    const heater = await screen.findByRole('link', {
      name: 'The water heater key for Hjemme expires in 3 days',
    })
    const sensor = screen.getByRole('link', { name: 'The sensor key for Hytta expires in 12 days' })
    expect(heater).toHaveAttribute('href', '/admin/locations?edit=home&key=heater')
    expect(sensor).toHaveAttribute('href', '/admin/locations?edit=cabin&key=sensor')
    expect(screen.getAllByRole('link').map((l) => l.textContent)).toEqual([
      'The water heater key for Hjemme expires in 3 days',
      'The sensor key for Hytta expires in 12 days',
    ])
  })

  it('marks an expired key as urgent and says what has stopped', async () => {
    renderBanner(['Admin'], list([item({ daysLeft: -3, expired: true })]))

    const line = await screen.findByRole('link', { name: /expired 3 days ago/ })
    expect(line).toHaveTextContent(
      'The sensor key for Hytta expired 3 days ago. Readings are refused until it is replaced.',
    )
    expect(line).toHaveAttribute('data-urgent', 'true')
  })

  it('shows three keys and "and N more"', async () => {
    renderBanner(
      ['Admin'],
      list(
        [1, 2, 3, 4].map((n) => item({ locationId: `l${n}`, locationName: `L${n}`, daysLeft: n })),
      ),
    )

    expect(await screen.findByRole('link', { name: 'and 1 more' })).toHaveAttribute(
      'href',
      '/admin/locations',
    )
    expect(screen.getAllByRole('link')).toHaveLength(4)
  })

  it('shows nothing when no key is due', async () => {
    const requests = renderBanner(['Admin'], list([]))

    await waitFor(() => expect(requests.count).toBe(1))
    expect(region()).not.toBeInTheDocument()
  })

  it('shows nothing, and asks once, when the list cannot be loaded', async () => {
    const requests = renderBanner(['Admin'], new Response(null, { status: 404 }))

    await waitFor(() => expect(requests.count).toBe(1))
    expect(region()).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('never asks for the list for a user who is not an administrator', async () => {
    const requests = renderBanner(['User'], list([item({})]))

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(requests.count).toBe(0)
    expect(region()).not.toBeInTheDocument()
  })
})
