import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { renderWithQuery } from '../../test/render'
import { server } from '../../test/server'
import { RecentUsage } from './RecentUsage'

interface Setup {
  /** kWh per minute right now and yesterday; null leaves that day without readings. */
  today?: number | null
  yesterday?: number | null
}

function useApi({ today = 0.05, yesterday = 0.1 }: Setup = {}) {
  server.use(
    http.get('*/api/consumption', ({ request }) => {
      const url = new URL(request.url)
      const from = new Date(url.searchParams.get('from')!).getTime()
      const to = new Date(url.searchParams.get('to')!).getTime()
      const isToday = to > Date.now() - 60_000 // the current window ends about now
      const perMinute = isToday ? today : yesterday
      const items =
        perMinute === null
          ? []
          : Array.from({ length: 10 }, (_, i) => ({
              // minutes inside the requested window, starting at its beginning
              periodStart: new Date(from + i * 60_000).toISOString(),
              consumptionKwh: perMinute,
            }))
      return HttpResponse.json({ granularity: 'minute', items, to })
    }),
  )
}

describe('RecentUsage', () => {
  it('shows the energy of the last two hours and how it compares with yesterday', async () => {
    useApi({ today: 0.05, yesterday: 0.1 })
    renderWithQuery(<RecentUsage locationId="l1" />)

    expect(await screen.findByText('Last 2 hours', { selector: 'div,h2,h3' })).toBeInTheDocument()
    expect(await screen.findByText(/0,5/)).toBeInTheDocument() // 10 minutes x 0.05 kWh
    expect(screen.getByText(/vs yesterday/)).toBeInTheDocument()
    expect(screen.getByText(/▼ 50%/)).toBeInTheDocument()
    expect(screen.getByText(/Yesterday, same two hours: 1 kWh/)).toBeInTheDocument()
  })

  it('shows a rise as expensive-coloured and with an up arrow', async () => {
    useApi({ today: 0.2, yesterday: 0.1 })
    renderWithQuery(<RecentUsage locationId="l1" />)

    expect(await screen.findByText(/▲ 100% vs yesterday/)).toBeInTheDocument()
  })

  it('still shows today when yesterday has no readings', async () => {
    useApi({ today: 0.05, yesterday: null })
    renderWithQuery(<RecentUsage locationId="l1" />)

    expect(
      await screen.findByText(/No readings from yesterday to compare with/),
    ).toBeInTheDocument()
    expect(screen.queryByText(/vs yesterday/)).not.toBeInTheDocument()
  })

  it('says so when there are no readings in the last two hours', async () => {
    useApi({ today: null })
    renderWithQuery(<RecentUsage locationId="l1" />)

    expect(await screen.findByText('No readings in the last 2 hours')).toBeInTheDocument()
  })

  it('shows the error when the data cannot be loaded', async () => {
    server.use(
      http.get('*/api/consumption', () =>
        HttpResponse.json({ title: 'Location not found' }, { status: 404 }),
      ),
    )
    renderWithQuery(<RecentUsage locationId="l1" />)

    expect(await screen.findByText(/not found|Could not load recent usage/i)).toBeInTheDocument()
  })
})
