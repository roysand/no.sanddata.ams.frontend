import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/server'
import { renderWithQuery } from '../../test/render'
import { osloDayStartUtc } from './format'
import { PriceTimeline } from './PriceTimeline'

const HOUR = 3_600_000

function prices(rate: (hour: number) => number | null, hours = 24) {
  const start = osloDayStartUtc(new Date()).getTime()
  return {
    date: '2026-11-13',
    zone: 'NO1',
    pricingModel: 'Spot',
    items: Array.from({ length: hours }, (_, i) => ({
      hourStart: new Date(start + i * HOUR).toISOString(),
      ratePerKwh: 0.5,
      spotRatePerKwh: rate(i),
    })),
  }
}

function renderTimeline(body: ReturnType<typeof prices>) {
  server.use(http.get('*/api/electricity-cost/prices', () => HttpResponse.json(body)))
  return renderWithQuery(<PriceTimeline locationId="l1" />)
}

describe('PriceTimeline', () => {
  it('lists every hour of the day with its price and level', async () => {
    renderTimeline(prices((i) => 0.5 + i * 0.05))

    const table = await screen.findByRole('table', { name: 'Price per hour today' })
    expect(within(table).getAllByRole('row')).toHaveLength(24)
    expect(within(table).getAllByText(/cheap/).length).toBeGreaterThan(0)
    expect(within(table).getAllByText(/expensive/).length).toBeGreaterThan(0)
  })

  it('marks exactly four best hours', async () => {
    renderTimeline(prices((i) => 0.5 + i * 0.05))

    const table = await screen.findByRole('table', { name: 'Price per hour today' })
    expect(within(table).getAllByText(/best hour/)).toHaveLength(4)
  })

  it('has 23 rows on a day when the clocks go forward', async () => {
    renderTimeline(prices((i) => 0.5 + i * 0.05, 23))

    const table = await screen.findByRole('table', { name: 'Price per hour today' })
    expect(within(table).getAllByRole('row')).toHaveLength(23)
  })

  it('shows the current hour in the readout', async () => {
    renderTimeline(prices((i) => 0.5 + i * 0.05))

    expect(await screen.findByText(/· now/, { selector: 'p' })).toBeInTheDocument()
  })

  it('says there are no best hours when every hour costs the same', async () => {
    renderTimeline(prices(() => 0.4))

    expect(await screen.findByText(/Every hour costs the same today/)).toBeInTheDocument()
    const table = screen.getByRole('table', { name: 'Price per hour today' })
    expect(within(table).queryByText(/best hour/)).not.toBeInTheDocument()
  })

  it('shows placeholders for hours without a price and ignores them for best hours', async () => {
    renderTimeline(prices((i) => (i < 20 ? 0.5 + i * 0.05 : null)))

    const table = await screen.findByRole('table', { name: 'Price per hour today' })
    expect(within(table).getAllByText(/price not available yet/)).toHaveLength(4)
    expect(within(table).getAllByText(/best hour/)).toHaveLength(4)
  })

  it('explains when no prices are published yet', async () => {
    renderTimeline(prices(() => null))

    expect(await screen.findByText('Prices not published yet')).toBeInTheDocument()
  })

  it('falls back to the not-published message when the request fails', async () => {
    server.use(
      http.get('*/api/electricity-cost/prices', () =>
        HttpResponse.json({ title: 'Location not found' }, { status: 404 }),
      ),
    )
    renderWithQuery(<PriceTimeline locationId="l1" />)

    expect(await screen.findByText('Prices not published yet')).toBeInTheDocument()
  })
})
