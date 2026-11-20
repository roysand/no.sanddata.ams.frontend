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

  it('says in cost mode that the cost includes VAT, the grid charge and taxes', async () => {
    useApi({ cost: 2 })
    const user = userEvent.setup()
    renderWithQuery(<UsageChart locationId="l1" />)

    await screen.findByText(/Today so far/)
    await user.click(screen.getByRole('button', { name: 'NOK' }))

    expect(
      await screen.findByText(
        "Cost includes VAT, the grid charge and taxes. The supplier's monthly fee and the grid capacity charge are not included; the bill for the month includes them.",
      ),
    ).toBeInTheDocument()
  })

  it('adds nothing about VAT in kWh mode, which shows energy and not money', async () => {
    useApi({ cost: 2 })
    renderWithQuery(<UsageChart locationId="l1" />)

    await screen.findByText(/Today so far/)

    expect(screen.queryByText(/Cost includes VAT/)).not.toBeInTheDocument()
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

describe('UsageChart stepping back', () => {
  beforeEach(() =>
    localStorage.setItem('ams.chart', JSON.stringify({ period: 'month', unit: 'kwh' })),
  )
  afterEach(() => localStorage.clear())

  const now = new Date()
  const title = (offset: number) => periodPlan('month', now, offset).current.title
  // The first reading was on the first day of the month two months ago.
  const firstReading = periodPlan('month', now, -2).current.fromDate

  /** 10 kWh for every day from the first reading on; the days asked for come from the request. */
  function useDailyApi() {
    const requested: string[] = []
    server.use(
      http.get('*/api/electricity-cost/daily', ({ request }) => {
        const params = new URL(request.url).searchParams
        const [from, to] = [params.get('from')!, params.get('to')!]
        requested.push(from)
        const days: string[] = []
        for (let d = new Date(`${from}T12:00:00Z`); d.toISOString().slice(0, 10) <= to;) {
          const date = d.toISOString().slice(0, 10)
          if (date >= firstReading) days.push(date)
          d = new Date(d.getTime() + 86_400_000)
        }
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
    return requested
  }

  it('starts on now, with no way forward', async () => {
    useDailyApi()
    renderWithQuery(<UsageChart locationId="l1" />)

    expect(await screen.findByText(`${title(0)} so far`)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeEnabled()
  })

  it('steps back a month at a time, compares with the month before, and steps forward again', async () => {
    const requested = useDailyApi()
    const user = userEvent.setup()
    renderWithQuery(<UsageChart locationId="l1" />)
    await screen.findByText(`${title(0)} so far`)

    await user.click(screen.getByRole('button', { name: 'Previous month' }))

    // A finished month is not "so far", and the comparison names the month before it.
    expect(await screen.findByText(title(-1), { selector: 'p' })).toBeInTheDocument()
    expect(screen.queryByText(/so far/)).not.toBeInTheDocument()
    expect(screen.getByText(new RegExp(`vs ${title(-2)}`))).toBeInTheDocument()
    expect(requested).toContain(periodPlan('month', now, -1).current.fromDate)
    expect(screen.getByRole('button', { name: 'Next month' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Next month' }))
    expect(await screen.findByText(`${title(0)} so far`)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled()
  })

  it('stops stepping back where there are no readings', async () => {
    useDailyApi()
    const user = userEvent.setup()
    renderWithQuery(<UsageChart locationId="l1" />)
    await screen.findByText(`${title(0)} so far`)

    const previous = () => screen.getByRole('button', { name: 'Previous month' })
    await user.click(previous())
    await screen.findByText(title(-1), { selector: 'p' })
    await user.click(previous())
    await screen.findByText(title(-2), { selector: 'p' })
    // Two months back still has readings, though the month before it has none.
    expect(previous()).toBeEnabled()

    await user.click(previous())
    expect(await screen.findByText(`No readings for ${title(-3)}`)).toBeInTheDocument()
    expect(previous()).toBeDisabled()
  })

  it('goes back to now when another period is chosen', async () => {
    useDailyApi()
    const user = userEvent.setup()
    renderWithQuery(<UsageChart locationId="l1" />)
    await screen.findByText(`${title(0)} so far`)

    await user.click(screen.getByRole('button', { name: 'Previous month' }))
    await screen.findByText(title(-1), { selector: 'p' })
    await user.click(screen.getByRole('button', { name: 'Week' }))

    expect(await screen.findByText('Last 7 days so far')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next week' })).toBeDisabled()
  })

  it('names yesterday in the day view', async () => {
    localStorage.setItem('ams.chart', JSON.stringify({ period: 'day', unit: 'kwh' }))
    useApi()
    const user = userEvent.setup()
    renderWithQuery(<UsageChart locationId="l1" />)
    await screen.findByText(/Today so far/)

    await user.click(screen.getByRole('button', { name: 'Previous day' }))

    expect(await screen.findByText('Yesterday', { selector: 'p' })).toBeInTheDocument()
  })
})

describe('UsageChart water heating', () => {
  beforeEach(() => localStorage.clear())

  type Part = { kwh: number; cost: number | null; sampledMinutes: number; capped: boolean }

  /** Today's first three hours at 3,4 kWh and 3,10 kr, with `parts[i]` as hour i's water heater part. */
  function useHeaterApi(parts: (Part | null)[]) {
    const dayPlan = periodPlan('day', new Date())
    server.use(
      http.get('*/api/electricity-cost/hourly', ({ request }) => {
        const isCurrent = new URL(request.url).searchParams.get('from') === dayPlan.current.fromUtc
        const slots = (isCurrent ? dayPlan.current : dayPlan.previous).slots.slice(0, 3)
        return HttpResponse.json({
          items: slots.map((slot, i) => ({
            hourStart: new Date(Number(slot.key)).toISOString(),
            consumptionKwh: 3.4,
            pricingModel: 'Spot',
            actual: { ratePerKwh: 1, cost: 3.1 },
            comparison: null,
            ...(isCurrent ? { waterHeater: parts[i] ?? null } : {}),
          })),
          page: 1,
          pageSize: 500,
          totalCount: 3,
        })
      }),
    )
  }

  const full = (kwh: number, cost: number | null): Part => ({
    kwh,
    cost,
    sampledMinutes: 60,
    capped: false,
  })

  async function selectFirstHour(user: ReturnType<typeof userEvent.setup>) {
    await screen.findByText(/Today so far/)
    const chart = screen.getByRole('group', { name: /Energy use|Cost/ })
    chart.focus()
    await user.keyboard('{ArrowRight}')
  }

  it('shows water heating and everything else for a selected hour, and a legend entry', async () => {
    useHeaterApi([full(2.1, 1.9), null, null])
    const user = userEvent.setup()
    renderWithQuery(<UsageChart locationId="l1" />)

    await selectFirstHour(user)

    expect(screen.getByText('Water heating', { selector: 'li' })).toBeInTheDocument()
    expect(
      await screen.findByText(/Water heating 2,1 kWh · Everything else 1,3 kWh/),
    ).toBeInTheDocument()
  })

  it('shows the costs in NOK', async () => {
    useHeaterApi([full(2.1, 1.9), null, null])
    const user = userEvent.setup()
    renderWithQuery(<UsageChart locationId="l1" />)
    await screen.findByText(/Today so far/)
    await user.click(screen.getByRole('button', { name: 'NOK' }))

    await selectFirstHour(user)

    expect(
      await screen.findByText(/Water heating 1,90\skr · Everything else 1,20\skr/),
    ).toBeInTheDocument()
  })

  it('says when an hour was only partly measured', async () => {
    useHeaterApi([{ kwh: 1, cost: 1, sampledMinutes: 40, capped: false }, null, null])
    const user = userEvent.setup()
    renderWithQuery(<UsageChart locationId="l1" />)

    await selectFirstHour(user)

    expect(await screen.findByText(/Water heating 1 kWh \(partly measured\)/)).toBeInTheDocument()
  })

  it('says nothing about water heating for an hour without a part', async () => {
    useHeaterApi([null, full(1, 1), null])
    const user = userEvent.setup()
    renderWithQuery(<UsageChart locationId="l1" />)

    await selectFirstHour(user)

    expect(await screen.findByText(/3,4 kWh/, { selector: 'p[aria-live] b' })).toBeInTheDocument()
    expect(screen.queryByText(/Water heating \d/)).not.toBeInTheDocument()
  })

  it('gives no split in NOK when the heater cost is unknown', async () => {
    useHeaterApi([full(2.1, null), null, null])
    const user = userEvent.setup()
    renderWithQuery(<UsageChart locationId="l1" />)
    await screen.findByText(/Today so far/)
    await user.click(screen.getByRole('button', { name: 'NOK' }))

    await selectFirstHour(user)

    expect(screen.queryByText(/Water heating \d/)).not.toBeInTheDocument()
    expect(screen.queryByText('Water heating', { selector: 'li' })).not.toBeInTheDocument()
  })

  it('looks as before without any water heater part', async () => {
    useHeaterApi([null, null, null])
    const user = userEvent.setup()
    renderWithQuery(<UsageChart locationId="l1" />)

    await selectFirstHour(user)

    expect(screen.queryByText('Water heating', { selector: 'li' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Water heating/)).not.toBeInTheDocument()
  })
})

describe('UsageChart car charging (spec 013)', () => {
  beforeEach(() => localStorage.clear())

  /** Today's first three hours: the house at 1,4 kWh and 1,40 kr; hour 0 charges 3 kWh, counted or not. */
  function useCarApi(included: boolean) {
    const dayPlan = periodPlan('day', new Date())
    server.use(
      http.get('*/api/electricity-cost/hourly', ({ request }) => {
        const isCurrent = new URL(request.url).searchParams.get('from') === dayPlan.current.fromUtc
        const slots = (isCurrent ? dayPlan.current : dayPlan.previous).slots.slice(0, 3)
        return HttpResponse.json({
          items: slots.map((slot, i) => {
            const car = isCurrent && i === 0 ? { kwh: 3, estimated: false, included } : null
            return {
              hourStart: new Date(Number(slot.key)).toISOString(),
              consumptionKwh: 1.4,
              totalKwh: 1.4 + (car?.included ? car.kwh : 0),
              pricingModel: 'Spot',
              actual: { ratePerKwh: 1, cost: 1.4 },
              comparison: null,
              waterHeater: null,
              evCharger: car,
            }
          }),
          page: 1,
          pageSize: 500,
          totalCount: 3,
        })
      }),
    )
  }

  async function selectFirstHour(user: ReturnType<typeof userEvent.setup>) {
    await screen.findByText(/Today so far/)
    const chart = screen.getByRole('group', { name: /Energy use|Cost/ })
    chart.focus()
    await user.keyboard('{ArrowRight}')
  }

  it('shows the car and everything else for a selected hour, and a legend entry', async () => {
    useCarApi(true)
    const user = userEvent.setup()
    renderWithQuery(<UsageChart locationId="l1" />)

    await selectFirstHour(user)

    expect(screen.getByText('Car charging', { selector: 'li' })).toBeInTheDocument()
    expect(await screen.findByText(/4,4 kWh/, { selector: 'p[aria-live] b' })).toBeInTheDocument()
    expect(
      await screen.findByText(/Car charging 3 kWh · Everything else 1,4 kWh/),
    ).toBeInTheDocument()
  })

  it('never shows the car in NOK', async () => {
    useCarApi(true)
    const user = userEvent.setup()
    renderWithQuery(<UsageChart locationId="l1" />)
    await screen.findByText(/Today so far/)
    await user.click(screen.getByRole('button', { name: 'NOK' }))

    await selectFirstHour(user)

    expect(screen.queryByText('Car charging', { selector: 'li' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Car charging \d/)).not.toBeInTheDocument()
  })

  it('looks as before when the car is not counted with the house', async () => {
    useCarApi(false)
    const user = userEvent.setup()
    renderWithQuery(<UsageChart locationId="l1" />)

    await selectFirstHour(user)

    expect(await screen.findByText(/1,4 kWh/, { selector: 'p[aria-live] b' })).toBeInTheDocument()
    expect(screen.queryByText('Car charging', { selector: 'li' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Car charging/)).not.toBeInTheDocument()
  })
})
