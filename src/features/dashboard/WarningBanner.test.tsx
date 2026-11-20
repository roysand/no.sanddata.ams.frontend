import { screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { renderWithQuery } from '../../test/render'
import { server } from '../../test/server'
import {
  ALL_DUE,
  billWith,
  CAPACITY_DUE,
  minutesAt,
  NORGESPRIS_DUE,
  USAGE_DUE,
  fridaysAt,
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
}

function renderBanner(figures: WarningFigures = {}) {
  server.use(...warningHandlers(figures))
  renderWithQuery(
    <MemoryRouter>
      <WarningBanner location={hjemme} />
    </MemoryRouter>,
  )
}

const region = () => screen.queryByRole('region', { name: 'Warnings for Hjemme' })

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

describe('WarningBanner Norgespris limit', () => {
  it('says the month is expected to go over the limit', async () => {
    renderBanner(NORGESPRIS_DUE)

    const line = await screen.findByRole('link', { name: /expected to use/ })
    expect(line).toHaveTextContent(
      /^Hjemme is expected to use 1\s240 kWh this month, above the Norgespris limit of 1\s000 kWh\. The kWh above it are priced at spot price\.$/,
    )
    expect(line).not.toHaveAttribute('data-urgent')
  })

  it('says the limit is passed, as urgent', async () => {
    renderBanner({ bill: billWith(1240, 1000, 200) })

    const line = await screen.findByRole('link', { name: /has passed the Norgespris limit/ })
    expect(line).toHaveTextContent(
      /^Hjemme has passed the Norgespris limit of 1\s000 kWh this month\. The rest of the month is priced at spot price\.$/,
    )
    expect(line).toHaveAttribute('data-urgent', 'true')
  })

  it('leaves the line out when the bill fails, and keeps the others', async () => {
    renderBanner({ ...USAGE_DUE, bill: 'fail' })

    expect(await screen.findByRole('link', { name: /uses 3,8 kW now/ })).toBeInTheDocument()
    expect(screen.queryByText(/Norgespris/)).not.toBeInTheDocument()
  })
})

describe('WarningBanner together', () => {
  it('shows all due warnings, capacity first, then usage, then Norgespris', async () => {
    renderBanner(ALL_DUE)

    await screen.findByRole('link', { name: /Norgespris/ })
    await screen.findByRole('link', { name: /may lift the capacity step/ })
    await screen.findByRole('link', { name: /uses 3,8 kW now/ })
    const texts = screen.getAllByRole('link').map((link) => link.textContent ?? '')
    expect(texts).toHaveLength(3)
    expect(texts[0]).toMatch(/capacity step/)
    expect(texts[1]).toMatch(/uses 3,8 kW now/)
    expect(texts[2]).toMatch(/Norgespris limit/)
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
      bill: 'fail',
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

  it('shares the capacity figures and the expected bill with the cards: one request each', async () => {
    const counts: Record<string, number> = {}
    server.events.on('request:start', ({ request }) => {
      const path = new URL(request.url).pathname
      counts[path] = (counts[path] ?? 0) + 1
    })
    server.use(...warningHandlers(ALL_DUE))
    renderWithQuery(
      <AuthContext.Provider value={auth}>
        <MemoryRouter>
          <WarningBanner location={hjemme} />
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
