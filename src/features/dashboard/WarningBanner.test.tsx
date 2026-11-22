import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { renderWithQuery } from '../../test/render'
import { server } from '../../test/server'
import {
  ALL_DUE,
  CAPACITY_DUE,
  minutesAt,
  NORGESPRIS_DUE,
  USAGE_DUE,
  fridaysAt,
  statusItem,
  tomorrowPrices,
  WARNING_NOW,
  warningHandlers,
  type WarningFigures,
} from '../../test/warnings'
import type { LocationSummary } from '../locations'
import { AuthContext, type AuthContextValue } from '../auth/context'
import { CapacityCard } from './CapacityCard'
import { ExpectedBillCard } from './ExpectedBillCard'
import { WarningBanner } from './WarningBanner'

// Friday 20 November 2026, 11:30 in Oslo: the hour 11–12 is 30 minutes in.
const NOW = WARNING_NOW

const hjemme: LocationSummary = {
  id: 'l1',
  name: 'Hjemme',
  address: 'Gata 1',
  zone: 'NO1',
  serialNumber: 'SN-l1',
  hasNorgesPriceAgreement: false,
  isActive: true,
  role: 'Owner',
  meters: [],
  hasEvCharger: false,
  includeEvCharger: false,
}

const cabin: LocationSummary = {
  ...hjemme,
  id: 'l2',
  name: 'Cabin',
  serialNumber: 'SN-l2',
  hasNorgesPriceAgreement: true,
}

/** Hjemme is selected; `locations` are the active ones. Returns the `onSelect` spy. */
function renderBanner(
  figures: WarningFigures = {},
  locations: LocationSummary[] = [hjemme, cabin],
) {
  const onSelect = vi.fn()
  server.use(...warningHandlers(figures))
  renderWithQuery(
    <MemoryRouter>
      <WarningBanner location={hjemme} locations={locations} onSelect={onSelect} />
    </MemoryRouter>,
  )
  return onSelect
}

const region = () => screen.queryByRole('region', { name: 'Warnings' })
const n = (text: string) => text.replace(/\s/g, ' ')
/** Each link's text, with nb-NO's narrow spaces as plain ones. */
const linkTexts = () => screen.getAllByRole('link').map((link) => n(link.textContent ?? ''))

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
})
afterEach(() => vi.useRealTimers())

describe('WarningBanner capacity step', () => {
  it('says this hour may lift the step, and the kW to stay under, linking to Now', async () => {
    renderBanner(CAPACITY_DUE)

    const line = await screen.findByRole('link', { name: /may lift the capacity step/ })
    expect(line).toHaveTextContent(
      'This hour may lift the capacity step above 10 kW. Stay under 10,6 kW for the rest of the hour.',
    )
    expect(line).toHaveAttribute('href', '/')
    expect(line).toHaveAttribute('data-urgent', 'true')
    expect(region()).toBeInTheDocument()
  })

  it('says the step is lifted once the hour has passed its limit', async () => {
    renderBanner({
      ...CAPACITY_DUE,
      current: {
        hourStart: '2026-11-20T10:00:00Z',
        consumptionKwhSoFar: 11.5,
        totalKwhSoFar: 11.5,
        evCharger: null,
        pricingModel: 'Spot',
        actual: null,
        comparison: null,
      },
    })

    expect(
      await screen.findByRole('link', {
        name: 'This hour has lifted the capacity step above 10 kW.',
      }),
    ).toBeInTheDocument()
  })

  it('shows nothing while no warning is due', async () => {
    renderBanner()

    await waitFor(() => expect(screen.queryByRole('link')).not.toBeInTheDocument())
    expect(region()).not.toBeInTheDocument()
  })
})

describe('WarningBanner unusual usage', () => {
  it('says how much more than usual the location uses now', async () => {
    renderBanner(USAGE_DUE)

    const line = await screen.findByRole('link', { name: /uses 3,8 kW now/ })
    expect(line).toHaveTextContent(
      'Hjemme uses 3,8 kW now, about 4× the usual 0,9 kW for a Friday at this hour.',
    )
    expect(line).not.toHaveAttribute('data-urgent')
  })

  it('compares with a usual of 0 without a ratio', async () => {
    renderBanner({ minutes: minutesAt(1.2), fourWeeks: fridaysAt(0) })

    expect(
      await screen.findByRole('link', {
        name: 'Hjemme uses 1,2 kW now, against the usual 0,0 kW for a Friday at this hour.',
      }),
    ).toBeInTheDocument()
  })

  it('says nothing when the usage is close to usual', async () => {
    renderBanner({ minutes: minutesAt(1.5), fourWeeks: fridaysAt(0.9) })

    await waitFor(() => expect(screen.queryByRole('link')).not.toBeInTheDocument())
    expect(region()).not.toBeInTheDocument()
  })
})

describe('WarningBanner Norgespris limit (spec 015)', () => {
  it("shows the cabin's over-the-limit line while Hjemme is selected, as urgent, without a close button", async () => {
    renderBanner({
      status: [
        statusItem({ kwhSoFar: 1084, projectedKwh: 1240, overLimit: true, overLimitKwh: 84 }),
      ],
    })

    const line = await screen.findByRole('link', { name: /over its Norgespris limit/ })
    expect(n(line.textContent ?? '')).toBe(
      'Cabin is over its Norgespris limit: 1 084 of 1 000 kWh. The kWh above it are priced at spot price until 1 December.',
    )
    expect(line).toHaveAttribute('data-urgent', 'true')
    expect(line).toHaveAttribute('href', '/')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('selects the line’s location when it is followed', async () => {
    const onSelect = renderBanner({ status: [statusItem({ kwhSoFar: 1084, overLimit: true })] })

    await userEvent.click(await screen.findByRole('link', { name: /over its Norgespris limit/ }))

    expect(onSelect).toHaveBeenCalledWith('l2')
  })

  it('leaves out a location that is not among the active ones', async () => {
    renderBanner({ ...USAGE_DUE, status: [statusItem({ kwhSoFar: 1084, overLimit: true })] }, [
      hjemme,
    ])

    await screen.findByRole('link', { name: /uses 3,8 kW now/ })
    expect(screen.queryByText(/Norgespris/)).not.toBeInTheDocument()
  })

  it.each([
    [
      1240,
      'Cabin: 912 of 1 000 kWh this month. At this pace the limit is reached in about 3 days.',
    ],
    [980, 'Cabin: 912 of 1 000 kWh this month, expected to end at 980 kWh.'],
    [null, 'Cabin: 912 of 1 000 kWh this month.'],
  ])('says how close the cabin is, projected at %s kWh', async (projectedKwh, text) => {
    // 10,5 days left at WARNING_NOW: 328 kWh to come is about 31 a day, so 88 kWh take about 3 days.
    renderBanner({ status: [statusItem({ kwhSoFar: 912, projectedKwh })] })

    const line = await screen.findByRole('link', { name: /^Cabin: 912/ })
    expect(n(line.textContent ?? '')).toBe(text)
    expect(line).not.toHaveAttribute('data-urgent')
  })

  it('says the limit is reached tomorrow at a fast pace', async () => {
    renderBanner({ status: [statusItem({ kwhSoFar: 960, projectedKwh: 960 + 50 * 10.5 })] })

    expect(n((await screen.findByRole('link', { name: /^Cabin: 960/ })).textContent ?? '')).toBe(
      'Cabin: 960 of 1 000 kWh this month. At this pace the limit is reached tomorrow.',
    )
  })

  it('says the month is expected to go over the limit below 90 %', async () => {
    renderBanner({ status: [statusItem({ kwhSoFar: 600, projectedKwh: 1240 })] })

    const line = await screen.findByRole('link', { name: /expected to use/ })
    expect(n(line.textContent ?? '')).toBe(
      'Cabin is expected to use 1 240 kWh this month, above the Norgespris limit of 1 000 kWh. The kWh above it are priced at spot price.',
    )
    expect(line).not.toHaveAttribute('data-urgent')
  })
})

describe('WarningBanner expensive hours tomorrow (spec 015)', () => {
  const over = statusItem({ kwhSoFar: 1084, overLimit: true })
  const sevenToNineAndFiveToEight = tomorrowPrices((h) =>
    [7, 8, 17, 19].includes(h) ? 2.1 : h === 18 ? 2.6 : 0.9,
  )

  it("lists tomorrow's hours at 4 × the Norgespris price", async () => {
    renderBanner({ status: [over], prices: { l2: sevenToNineAndFiveToEight } })

    const line = await screen.findByRole('link', { name: /tomorrow/ })
    expect(n(line.textContent ?? '')).toBe(
      'Cabin, tomorrow: spot price is high 07–09 and 17–20, up to 2,60 kr/kWh.',
    )
    expect(line).not.toHaveAttribute('data-urgent')
  })

  it('lists three ranges and counts the rest', async () => {
    const prices = tomorrowPrices((h) => ([6, 8, 11, 14, 15, 20, 22].includes(h) ? 2.6 : 0.9))
    renderBanner({ status: [over], prices: { l2: prices } })

    expect(n((await screen.findByRole('link', { name: /tomorrow/ })).textContent ?? '')).toBe(
      'Cabin, tomorrow: spot price is high 06–07, 08–09, 11–12 and 4 more hours, up to 2,60 kr/kWh.',
    )
  })

  it('shows no line when no hour is that expensive', async () => {
    renderBanner({ status: [over], prices: { l2: tomorrowPrices(() => 1.99) } })

    await screen.findByRole('link', { name: /over its Norgespris limit/ })
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(screen.queryByRole('link', { name: /tomorrow/ })).not.toBeInTheDocument()
  })

  it("doesn't read tomorrow's prices for a location within its limit", async () => {
    const asked: string[] = []
    server.events.on('request:start', ({ request }) => {
      const url = new URL(request.url)
      if (url.pathname === '/api/electricity-cost/prices') {
        asked.push(url.searchParams.get('locationId') ?? '')
      }
    })
    renderBanner({
      status: [statusItem({ locationId: 'l1', limitKwh: 5000, kwhSoFar: 900 }), over],
      prices: { l1: sevenToNineAndFiveToEight, l2: sevenToNineAndFiveToEight },
    })

    expect(await screen.findAllByRole('link', { name: /tomorrow/ })).toHaveLength(1)
    expect(asked).toEqual(['l2'])
    server.events.removeAllListeners('request:start')
  })

  it("keeps the limit line when tomorrow's prices fail", async () => {
    renderBanner({ status: [over], prices: { l2: 'fail' } })

    await screen.findByRole('link', { name: /over its Norgespris limit/ })
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(screen.queryByRole('link', { name: /tomorrow/ })).not.toBeInTheDocument()
  })
})

describe('WarningBanner together', () => {
  it('orders the lines: capacity, usage, the limits with the selected first, then expensive hours', async () => {
    const aasen: LocationSummary = { ...cabin, id: 'l3', name: 'Åsen', serialNumber: 'SN-l3' }
    renderBanner(
      {
        ...CAPACITY_DUE,
        ...USAGE_DUE,
        status: [
          statusItem({ locationId: 'l3', kwhSoFar: 600, projectedKwh: 1240 }),
          statusItem({ kwhSoFar: 1084, overLimit: true }),
          statusItem({ locationId: 'l1', limitKwh: 5000, kwhSoFar: 4600, projectedKwh: 4900 }),
        ],
        prices: { l2: tomorrowPrices((h) => (h === 18 ? 2.6 : 1)) },
      },
      [hjemme, cabin, aasen],
    )

    await screen.findByRole('link', { name: /tomorrow/ })
    await screen.findByRole('link', { name: /may lift the capacity step/ })
    await screen.findByRole('link', { name: /uses 3,8 kW now/ })
    const texts = linkTexts()
    expect(texts).toHaveLength(6)
    expect(texts[0]).toMatch(/capacity step/)
    expect(texts[1]).toMatch(/^Hjemme uses 3,8 kW now/)
    expect(texts[2]).toMatch(/^Hjemme: 4 600 of 5 000 kWh/)
    expect(texts[3]).toMatch(/^Cabin is over/)
    expect(texts[4]).toMatch(/^Åsen is expected to use/)
    expect(texts[5]).toMatch(/^Cabin, tomorrow: spot price is high 18–19/)
  })

  it('names the only location', async () => {
    renderBanner(NORGESPRIS_DUE, [hjemme])

    expect(
      await screen.findByRole('link', { name: /^Hjemme is expected to use/ }),
    ).toBeInTheDocument()
  })

  it('shows no Norgespris lines, and no error, when the status fails', async () => {
    renderBanner({ ...CAPACITY_DUE, status: 'fail' })

    await screen.findByRole('link', { name: /may lift the capacity step/ })
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(screen.queryByText(/Norgespris/)).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows nothing, and no error, when every figure fails', async () => {
    let requests = 0
    server.events.on('request:start', () => {
      requests++
    })
    renderBanner({
      capacity: 'fail',
      today: 'fail',
      current: 'fail',
      minutes: 'fail',
      fourWeeks: 'fail',
      status: 'fail',
    })

    await waitFor(() => expect(requests).toBeGreaterThanOrEqual(6))
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(region()).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    server.events.removeAllListeners('request:start')
  })
})

describe('WarningBanner and the Now cards', () => {
  const auth: AuthContextValue = {
    isAuthenticated: true,
    isLoading: false,
    email: 'someone@sanddata.no',
    roles: ['User'],
    login: async () => {},
    logout: () => {},
  }

  it('shares the capacity figures with the card: one request each, and leaves the bill to its card', async () => {
    const counts: Record<string, number> = {}
    server.events.on('request:start', ({ request }) => {
      const path = new URL(request.url).pathname
      counts[path] = (counts[path] ?? 0) + 1
    })
    server.use(...warningHandlers(ALL_DUE))
    renderWithQuery(
      <AuthContext.Provider value={auth}>
        <MemoryRouter>
          <WarningBanner location={hjemme} locations={[hjemme]} onSelect={() => {}} />
          <CapacityCard locationId={hjemme.id} />
          <ExpectedBillCard locationId={hjemme.id} />
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    await screen.findByRole('link', { name: /Norgespris/ })
    await screen.findByRole('link', { name: /may lift the capacity step/ })
    expect(counts['/api/electricity-cost/capacity']).toBe(1)
    expect(counts['/api/electricity-cost/bill']).toBe(1)
    server.events.removeAllListeners('request:start')
  })
})
