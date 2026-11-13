import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/server'
import { renderWithQuery } from '../../test/render'
import { periodPlan } from './periods'
import { UsageChart } from './UsageChart'

interface Handlers {
  /** Cost for the current period's hours; null means unpriced. */
  cost?: number | null
  empty?: boolean
  previousKwh?: number
}

function useApi({ cost = 2, empty = false, previousKwh = 1 }: Handlers = {}) {
  const dayPlan = periodPlan('day', new Date())
  const weekPlan = periodPlan('week', new Date())

  server.use(
    http.get('*/api/electricity-cost/hourly', ({ request }) => {
      const from = new URL(request.url).searchParams.get('from')
      const isCurrent = from === dayPlan.current.fromUtc
      if (empty && isCurrent) {
        return HttpResponse.json({ items: [], page: 1, pageSize: 500, totalCount: 0 })
      }
      const slots = isCurrent
        ? dayPlan.current.slots.slice(0, 3)
        : dayPlan.previous.slots.slice(0, 3)
      return HttpResponse.json({
        items: slots.map((slot) => ({
          hourStart: new Date(Number(slot.key)).toISOString(),
          consumptionKwh: isCurrent ? 2 : previousKwh,
          pricingModel: 'Spot',
          actual: cost === null ? null : { ratePerKwh: 1, cost: isCurrent ? cost : 1 },
          comparison: null,
        })),
        page: 1,
        pageSize: 500,
        totalCount: 3,
      })
    }),
    http.get('*/api/electricity-cost/daily', ({ request }) => {
      // A request for last year gets one October day; anything else gets the current week.
      const from = new URL(request.url).searchParams.get('from') ?? ''
      const lastYear = String(new Date().getFullYear() - 1)
      const days = from.startsWith(lastYear)
        ? [`${lastYear}-10-15`]
        : weekPlan.current.slots.map((slot) => slot.key)
      return HttpResponse.json({
        items: days.map((date) => ({
          date,
          consumptionKwh: 10,
          pricingModel: 'Spot',
          actual: { cost: 12 },
          comparison: null,
        })),
      })
    }),
  )
}

describe('UsageChart', () => {
  beforeEach(() => localStorage.clear())

  it('starts on Day in kWh with the total and the comparison with yesterday', async () => {
    useApi()
    renderWithQuery(<UsageChart locationId="l1" />)

    expect(await screen.findByText(/Today so far/)).toBeInTheDocument()
    expect(screen.getByText(/6 kWh/)).toBeInTheDocument() // 3 hours x 2 kWh
    expect(screen.getByText(/↑|▲/)).toBeInTheDocument() // 6 kWh against 3 kWh yesterday
    expect(screen.getByRole('button', { name: 'Day' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'kWh' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows cost when the unit is switched to NOK', async () => {
    useApi({ cost: 2 })
    const user = userEvent.setup()
    renderWithQuery(<UsageChart locationId="l1" />)

    await screen.findByText(/Today so far/)
    await user.click(screen.getByRole('button', { name: 'NOK' }))

    expect(await screen.findByText(/6,00/)).toBeInTheDocument() // 3 hours x 2 kr
  })

  it('switches to the week view and loads daily data', async () => {
    useApi()
    const user = userEvent.setup()
    renderWithQuery(<UsageChart locationId="l1" />)

    await screen.findByText(/Today so far/)
    await user.click(screen.getByRole('button', { name: 'Week' }))

    expect(await screen.findByText(/Last 7 days so far/)).toBeInTheDocument()
    expect(screen.getByText(/70 kWh/)).toBeInTheDocument() // 7 days x 10 kWh
  })

  it('shows this year and last year side by side on the Year tab', async () => {
    useApi()
    const user = userEvent.setup()
    renderWithQuery(<UsageChart locationId="l1" />)

    await screen.findByText(/Today so far/)
    await user.click(screen.getByRole('button', { name: 'Year' }))

    const year = String(new Date().getFullYear())
    const lastYear = String(new Date().getFullYear() - 1)
    expect(await screen.findByText(new RegExp(`${year} so far`))).toBeInTheDocument()
    expect(screen.getByText(lastYear, { selector: 'li' })).toBeInTheDocument()
    expect(screen.getByText(year, { selector: 'li' })).toBeInTheDocument()
  })

  it('remembers the chosen period and unit', async () => {
    useApi()
    const user = userEvent.setup()
    renderWithQuery(<UsageChart locationId="l1" />)

    await screen.findByText(/Today so far/)
    await user.click(screen.getByRole('button', { name: 'Month' }))
    await user.click(screen.getByRole('button', { name: 'NOK' }))

    expect(JSON.parse(localStorage.getItem('ams.chart')!)).toEqual({ period: 'month', unit: 'nok' })
  })

  it('restores a remembered choice', async () => {
    localStorage.setItem('ams.chart', JSON.stringify({ period: 'week', unit: 'kwh' }))
    useApi()
    renderWithQuery(<UsageChart locationId="l1" />)

    expect(await screen.findByText(/Last 7 days so far/)).toBeInTheDocument()
  })

  it('says there is nothing to chart without readings', async () => {
    useApi({ empty: true })
    renderWithQuery(<UsageChart locationId="l1" />)

    expect(await screen.findByText('Nothing to chart yet')).toBeInTheDocument()
  })

  it('keeps kWh usable and explains that cost needs prices when NOK has no priced hours', async () => {
    useApi({ cost: null })
    const user = userEvent.setup()
    renderWithQuery(<UsageChart locationId="l1" />)

    await screen.findByText(/Today so far/)
    await user.click(screen.getByRole('button', { name: 'NOK' }))

    expect(await screen.findByText('Cost needs prices')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'kWh' }))
    expect(await screen.findByText(/Today so far/)).toBeInTheDocument()
  })

  it('leaves out the comparison when the previous period has no data', async () => {
    useApi({ previousKwh: 0 })
    renderWithQuery(<UsageChart locationId="l1" />)

    await screen.findByText(/Today so far/)
    expect(screen.queryByText(/vs yesterday/)).not.toBeInTheDocument()
  })
})
