import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/server'
import type { AdminLocation } from '../locations'
import { SensorKeySection } from './SensorKeySection'

const cabin = (expiresAt: string, isActive = true): AdminLocation => ({
  id: 'loc-1',
  name: 'Hytta',
  address: 'Hyttevegen 1',
  serialNumber: 'SN-1',
  zone: 'NO3',
  isActive: true,
  hasNorgesPriceAgreement: false,
  meters: [],
  apiKey: {
    description: 'Sensor key for Hytta',
    hint: 'a1b2',
    isActive,
    expiresAt,
    status: 'Active',
  },
  users: [],
})

const NEW_KEY = 'NEWKEY-123-must-not-stay'

/**
 * Serves rotate (or `rotateAnswer`) and counts its calls. The location list and the reminders are in the cache, so a
 * test can see that replacing a key marks them for refreshing.
 */
function setup(location: AdminLocation, rotateAnswer?: () => Response) {
  const counts = { rotate: 0 }
  server.use(
    http.post('*/api/admin/locations/:id/api-key/rotate', () => {
      counts.rotate++
      return (
        rotateAnswer?.() ??
        HttpResponse.json({ apiKey: NEW_KEY, hint: 'z9y8', expiresAt: '2028-11-20T10:00:00Z' })
      )
    }),
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(['admin', 'locations'], [location])
  queryClient.setQueryData(['admin', 'key-reminders'], {
    today: '2026-11-20',
    windowDays: 30,
    items: [],
  })
  render(
    <QueryClientProvider client={queryClient}>
      <SensorKeySection location={location} />
    </QueryClientProvider>,
  )
  return { counts, queryClient }
}

describe('SensorKeySection', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-20T10:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('shows the hint, status and expiry, marked when it is within 30 days', () => {
    setup(cabin('2026-12-02T09:14:03Z'))

    const section = screen.getByRole('region', { name: 'Sensor key' })
    expect(within(section).getByText(/…a1b2 · Active · expires 02\.12\.2026/)).toBeInTheDocument()
    expect(within(section).getByText('expires in 12 days')).toBeInTheDocument()
  })

  it('has no badge when the key is far from expiring', () => {
    setup(cabin('2028-11-19T12:00:00Z'))
    expect(screen.queryByText(/expires in/)).not.toBeInTheDocument()
  })

  it('has no badge for a deactivated key, which is off on purpose', () => {
    setup(cabin('2026-12-02T09:14:03Z', false))
    expect(screen.queryByText(/expires in/)).not.toBeInTheDocument()
  })

  it('asks before replacing, and sends nothing when cancelled', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const { counts } = setup(cabin('2026-12-02T09:14:03Z'))

    await user.click(screen.getByRole('button', { name: 'Replace sensor key' }))

    const dialog = screen.getByRole('dialog', { name: 'Replace the sensor key for Hytta?' })
    expect(dialog).toHaveTextContent(
      "The current key stops working at once. Readings are refused until the reader's forwarder has the new key.",
    )
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(counts.rotate).toBe(0)
  })

  it('shows the new key once, then forgets it, and refreshes the list and the reminders', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const { counts, queryClient } = setup(cabin('2026-12-02T09:14:03Z'))

    await user.click(screen.getByRole('button', { name: 'Replace sensor key' }))
    await user.click(screen.getByRole('button', { name: 'Replace key' }))

    const dialog = await screen.findByRole('dialog', { name: 'New sensor key for Hytta' })
    expect(within(dialog).getByText(NEW_KEY)).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Copy key' })).toBeInTheDocument()
    expect(dialog).toHaveTextContent('Valid until 20.11.2028.')
    expect(counts.rotate).toBe(1)
    // The new hint and expiry, and the banner, follow at once.
    expect(queryClient.getQueryState(['admin', 'locations'])?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(['admin', 'key-reminders'])?.isInvalidated).toBe(true)

    await user.click(within(dialog).getByRole('button', { name: 'Done' }))

    expect(screen.queryByText(NEW_KEY)).not.toBeInTheDocument()
    expect(JSON.stringify({ ...localStorage })).not.toContain(NEW_KEY)
    expect(window.location.href).not.toContain(NEW_KEY)
  })

  it('keeps the old key and shows the error when replacing fails', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    setup(cabin('2026-12-02T09:14:03Z'), () =>
      HttpResponse.json({ errors: { generalErrors: ['Location not found'] } }, { status: 404 }),
    )

    await user.click(screen.getByRole('button', { name: 'Replace sensor key' }))
    await user.click(screen.getByRole('button', { name: 'Replace key' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Location not found')
    expect(
      screen.getByRole('dialog', { name: 'Replace the sensor key for Hytta?' }),
    ).toBeInTheDocument()
    expect(screen.queryByText(NEW_KEY)).not.toBeInTheDocument()
  })
})
