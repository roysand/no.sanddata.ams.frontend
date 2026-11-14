import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { renderWithQuery } from '../../test/render'
import { server } from '../../test/server'
import { RecentUsage } from './RecentUsage'

const HOUR = 3_600_000

interface Setup {
  /** kWh per minute today and yesterday; null leaves that day without readings. */
  today?: number | null
  yesterday?: number | null
  /** NOK per kWh today and yesterday; null leaves the hours without a price. */
  todayRate?: number | null
  yesterdayRate?: number | null
}

function useApi({ today = 0.05, yesterday = 0.1, todayRate = 1, yesterdayRate = 2 }: Setup = {}) {
  const isToday = (url: URL) =>
    new Date(url.searchParams.get('to')!).getTime() > Date.now() - 60_000

  server.use(
    http.get('*/api/consumption', ({ request }) => {
      const url = new URL(request.url)
      const from = new Date(url.searchParams.get('from')!).getTime()
      const perMinute = isToday(url) ? today : yesterday
      const items =
        perMinute === null
          ? []
          : Array.from({ length: 10 }, (_, i) => ({
              // ten minutes at the start of the requested window
              periodStart: new Date(from + i * 60_000).toISOString(),
              consumptionKwh: perMinute,
            }))
      return HttpResponse.json({ granularity: 'minute', items })
    }),
    http.get('*/api/electricity-cost/hourly', ({ request }) => {
      const url = new URL(request.url)
      const from = new Date(url.searchParams.get('from')!).getTime()
      const rate = isToday(url) ? todayRate : yesterdayRate
      return HttpResponse.json({
        items: Array.from({ length: 4 }, (_, i) => ({
          hourStart: new Date(from + i * HOUR).toISOString(),
          consumptionKwh: 1,
          pricingModel: 'Spot',
          actual: rate === null ? null : { ratePerKwh: rate, cost: rate },
          comparison: null,
        })),
        page: 1,
        pageSize: 500,
        totalCount: 4,
      })
    }),
  )
}

describe('RecentUsage', () => {
  it('shows energy and cost of the last three hours and how they compare with yesterday', async () => {
    useApi()
    renderWithQuery(<RecentUsage locationId="l1" />)

    expect(await screen.findByText('Last 3 hours')).toBeInTheDocument()
    expect(await screen.findByText(/▼ 50% vs yesterday/)).toBeInTheDocument() // 0,5 against 1 kWh
    expect(screen.getByText(/▼ 75% vs yesterday/)).toBeInTheDocument() // 0,50 against 2,00 kr
    expect(screen.getByText('Cost')).toBeInTheDocument()
    expect(screen.getByText(/Yesterday, same 3 hours: 1 kWh/)).toBeInTheDocument()
  })

  it('shows a rise with an up arrow', async () => {
    useApi({ today: 0.2, todayRate: 4, yesterday: 0.1, yesterdayRate: 1 })
    renderWithQuery(<RecentUsage locationId="l1" />)

    expect(await screen.findByText(/▲ 100% vs yesterday/)).toBeInTheDocument() // energy
    expect(screen.getByText(/▲ 700% vs yesterday/)).toBeInTheDocument() // 8 kr against 1 kr
  })

  it('shows energy and says the price is missing when the hours have no price', async () => {
    useApi({ todayRate: null, yesterdayRate: null })
    renderWithQuery(<RecentUsage locationId="l1" />)

    expect(await screen.findByText('Price not available yet')).toBeInTheDocument()
    expect(screen.getByText(/▼ 50% vs yesterday/)).toBeInTheDocument()
  })

  it('still shows today when yesterday has no readings', async () => {
    useApi({ yesterday: null })
    renderWithQuery(<RecentUsage locationId="l1" />)

    expect(
      await screen.findByText(/No readings from yesterday to compare with/),
    ).toBeInTheDocument()
    expect(screen.queryByText(/vs yesterday/)).not.toBeInTheDocument()
  })

  it('says so when there are no readings in the last three hours', async () => {
    useApi({ today: null })
    renderWithQuery(<RecentUsage locationId="l1" />)

    expect(await screen.findByText('No readings in the last 3 hours')).toBeInTheDocument()
  })

  it('shows the error when the data cannot be loaded', async () => {
    server.use(
      http.get('*/api/consumption', () =>
        HttpResponse.json({ title: 'Location not found' }, { status: 404 }),
      ),
      http.get('*/api/electricity-cost/hourly', () =>
        HttpResponse.json({ title: 'Location not found' }, { status: 404 }),
      ),
    )
    renderWithQuery(<RecentUsage locationId="l1" />)

    expect(await screen.findByText(/not found|Could not load recent usage/i)).toBeInTheDocument()
  })
})
