import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { renderWithQuery } from '../../test/render'
import { server } from '../../test/server'
import { RecentUsage } from './RecentUsage'

const HOUR = 3_600_000
const SPOT_PARTS = {
  energy: 1,
  markup: 0.02,
  grid: 0.3,
  taxes: 0.08,
  vat: 0.35,
  total: 1.75,
  gridSet: true,
}
const LIMIT = /above the Norgespris monthly limit/

interface Setup {
  /** kWh per minute today and yesterday; null leaves that day without readings. */
  today?: number | null
  yesterday?: number | null
  /** NOK per kWh today and yesterday; null leaves the hours without a price. */
  todayRate?: number | null
  yesterdayRate?: number | null
  /** Today's hours are on Norgespris and the second one is partly above the monthly limit. */
  aboveLimit?: boolean
  /** The heater's 5-minute steps for today's window ('fail' answers 500); left out, the endpoint is not served. */
  heater?: { powerKw: number; sampledSeconds: number }[] | 'fail'
}

function useApi({
  today = 0.05,
  yesterday = 0.1,
  todayRate = 1,
  yesterdayRate = 2,
  aboveLimit = false,
  heater,
}: Setup = {}) {
  const heaterCalls = { count: 0 }
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
      const split = aboveLimit && isToday(url)
      return HttpResponse.json({
        items: Array.from({ length: 4 }, (_, i) => ({
          hourStart: new Date(from + i * HOUR).toISOString(),
          consumptionKwh: 1,
          pricingModel: split ? 'NorgesPris' : 'Spot',
          actual:
            rate === null
              ? null
              : {
                  ratePerKwh: rate,
                  cost: rate,
                  cap:
                    split && i === 1
                      ? { kwhWithinCap: 0.5, kwhAboveCap: 0.5, aboveCapParts: SPOT_PARTS }
                      : null,
                },
          comparison: null,
        })),
        page: 1,
        pageSize: 500,
        totalCount: 4,
      })
    }),
    http.get('*/api/locations/:id/water-heater/power', ({ request }) => {
      heaterCalls.count++
      if (heater === 'fail') return HttpResponse.json({}, { status: 500 })
      const url = new URL(request.url)
      const from = new Date(url.searchParams.get('from')!).getTime()
      return HttpResponse.json({
        locationId: 'l1',
        from: url.searchParams.get('from'),
        to: url.searchParams.get('to'),
        stepSeconds: 300,
        // From the start of the window, where the consumption handler serves its ten minutes.
        items: (heater ?? []).map((step, i) => ({
          start: new Date(from + i * 5 * 60_000).toISOString(),
          ...step,
        })),
      })
    }),
  )
  return heaterCalls
}

describe('RecentUsage', () => {
  it('shows energy and cost of the last three hours and how they compare with yesterday', async () => {
    useApi()
    renderWithQuery(<RecentUsage locationId="l1" />)

    expect(await screen.findByText('Last 3 hours')).toBeInTheDocument()
    expect(await screen.findByText(/▼ 50% vs yesterday/)).toBeInTheDocument() // 0,5 against 1 kWh
    expect(screen.getByText(/▼ 75% vs yesterday/)).toBeInTheDocument() // 0,50 against 2,00 kr
    expect(screen.getByText('Cost incl. VAT')).toBeInTheDocument()
    expect(screen.getByText('Power')).toBeInTheDocument()
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

  it('says when part of the period is above the Norgespris monthly limit', async () => {
    useApi({ aboveLimit: true })
    renderWithQuery(<RecentUsage locationId="l1" />)

    expect(await screen.findByText(LIMIT)).toBeInTheDocument()
  })

  it('says nothing about the limit when no hour is above it', async () => {
    useApi()
    renderWithQuery(<RecentUsage locationId="l1" />)

    expect(await screen.findByText('Cost incl. VAT')).toBeInTheDocument()
    expect(screen.queryByText(LIMIT)).not.toBeInTheDocument()
  })
})

describe('RecentUsage steps on the clock (spec 014, US2)', () => {
  it('asks for a window that starts on whole 5 minutes', async () => {
    const froms: number[] = []
    useApi()
    server.use(
      http.get('*/api/consumption', ({ request }) => {
        froms.push(new Date(new URL(request.url).searchParams.get('from')!).getTime())
        return HttpResponse.json({ granularity: 'minute', items: [] })
      }),
    )
    renderWithQuery(<RecentUsage locationId="l1" />)

    await screen.findByText('No readings in the last 3 hours')
    expect(froms).toHaveLength(2)
    for (const from of froms) expect(from % (5 * 60_000)).toBe(0)
  })
})

describe('RecentUsage water heating (spec 014, US1)', () => {
  const TWO_STEPS = [
    { powerKw: 2, sampledSeconds: 300 },
    { powerKw: 2, sampledSeconds: 300 },
  ]

  it('adds water heating to the legend for a location with a heater', async () => {
    useApi({ heater: TWO_STEPS })
    renderWithQuery(<RecentUsage locationId="l1" hasWaterHeater />)

    expect(await screen.findByText('Water heating', { selector: 'li' })).toBeInTheDocument()
  })

  it('asks for nothing and looks as before without a heater', async () => {
    const calls = useApi({ heater: TWO_STEPS })
    renderWithQuery(<RecentUsage locationId="l1" />)

    await screen.findAllByText(/vs yesterday/)
    expect(screen.queryByText('Water heating', { selector: 'li' })).not.toBeInTheDocument()
    expect(calls.count).toBe(0)
  })

  it('shows the house as normal and a note when the heater figures fail', async () => {
    useApi({ heater: 'fail' })
    renderWithQuery(<RecentUsage locationId="l1" hasWaterHeater />)

    expect(await screen.findByText('Water heating could not be loaded.')).toBeInTheDocument()
    expect(screen.getByText('Cost incl. VAT')).toBeInTheDocument()
    expect(screen.getAllByText(/vs yesterday/)).toHaveLength(2)
  })

  it('shows no water heating and no note when the window has no heater steps', async () => {
    const calls = useApi({ heater: [] })
    renderWithQuery(<RecentUsage locationId="l1" hasWaterHeater />)

    await screen.findAllByText(/vs yesterday/)
    await waitFor(() => expect(calls.count).toBe(1))
    expect(screen.queryByText('Water heating', { selector: 'li' })).not.toBeInTheDocument()
    expect(screen.queryByText('Water heating could not be loaded.')).not.toBeInTheDocument()
  })
})

describe('RecentUsage water heating share (spec 014, US3)', () => {
  it('says how much of the 3 hours was water heating', async () => {
    useApi({ heater: [{ powerKw: 2, sampledSeconds: 300 }] })
    renderWithQuery(<RecentUsage locationId="l1" hasWaterHeater />)

    expect(
      await screen.findByText(/^Water heating: [\d,]+ kWh of [\d,]+ kWh \(\d+ %\)$/),
    ).toBeInTheDocument()
  })

  it('says nothing about it without heater steps', async () => {
    const calls = useApi({ heater: [] })
    renderWithQuery(<RecentUsage locationId="l1" hasWaterHeater />)

    await screen.findAllByText(/vs yesterday/)
    await waitFor(() => expect(calls.count).toBe(1))
    expect(screen.queryByText(/^Water heating:/)).not.toBeInTheDocument()
  })
})
