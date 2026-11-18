import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/server'
import { renderWithQuery } from '../../test/render'
import { formatClock, osloDayStartUtc } from './format'
import { CheapestTimeCard } from './CheapestTimeCard'

const HOUR = 3_600_000

function day(rate: (hour: number) => number | null, dayOffset = 0) {
  const start = osloDayStartUtc(new Date()).getTime() + dayOffset * 24 * HOUR
  return {
    date: '2026-11-18',
    zone: 'NO1',
    pricingModel: 'Spot',
    items: Array.from({ length: 24 }, (_, i) => ({
      hourStart: new Date(start + i * HOUR).toISOString(),
      ratePerKwh: rate(i),
      spotRatePerKwh: rate(i),
    })),
  }
}

function useApi(today: ReturnType<typeof day>, tomorrow = day(() => null, 1)) {
  server.use(
    http.get('*/api/electricity-cost/prices', ({ request }) =>
      HttpResponse.json(new URL(request.url).searchParams.has('date') ? tomorrow : today),
    ),
  )
}

/** Clock label of an hour tomorrow, as the card shows it. */
const tomorrowAt = (hour: number) =>
  formatClock(new Date(osloDayStartUtc(new Date()).getTime() + (24 + hour) * HOUR).toISOString())

describe('CheapestTimeCard', () => {
  beforeEach(() => localStorage.clear())

  it('finds the cheapest run in tomorrow and says how much cheaper it is than starting now', async () => {
    useApi(
      day(() => 2),
      day((i) => (i >= 2 && i < 5 ? 0.5 : 2), 1),
    )
    renderWithQuery(<CheapestTimeCard locationId="l1" />)

    expect(
      await screen.findByText(`Tomorrow, ${tomorrowAt(2)}–${tomorrowAt(5)}`),
    ).toBeInTheDocument()
    expect(screen.getByText(/cheaper than starting now \(75 %\)/)).toBeInTheDocument()
    expect(screen.queryByText(/usually appear around 13:00/)).not.toBeInTheDocument()
  })

  it('says when tomorrow is not known yet and when now is the cheapest', async () => {
    // One hour always fits in what is left of today, whatever time the test runs.
    localStorage.setItem('ams.cheapest', '1')
    useApi(day(() => 1))
    renderWithQuery(<CheapestTimeCard locationId="l1" />)

    expect(await screen.findByText(/now is the cheapest time/)).toBeInTheDocument()
    expect(screen.getByText(/usually appear around 13:00/)).toBeInTheDocument()
  })

  it('remembers how many hours were chosen', async () => {
    useApi(
      day(() => 2),
      day(() => 1, 1),
    )
    const user = userEvent.setup()
    renderWithQuery(<CheapestTimeCard locationId="l1" />)

    await screen.findByText(/Best start/)
    await user.click(screen.getByRole('button', { name: '1 h' }))

    expect(screen.getByRole('button', { name: '1 h' })).toHaveAttribute('aria-pressed', 'true')
    expect(localStorage.getItem('ams.cheapest')).toBe('1')
  })
})
