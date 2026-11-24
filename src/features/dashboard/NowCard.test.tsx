import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/server'
import { renderWithQuery } from '../../test/render'
import { LIVE_STATES, liveState, serveLiveState } from '../../test/evCharger'
import { AuthContext, type AuthContextValue } from '../auth/context'
import { osloDayStartUtc } from './format'
import { NowCard } from './NowCard'
import type { CapSplit } from './types'

const HOUR = 3_600_000

const USER: AuthContextValue = {
  isAuthenticated: true,
  isLoading: false,
  email: 'someone@sanddata.no',
  roles: ['User'],
  login: async () => {},
  logout: () => {},
}

// A plan at 0,49 kr/kWh: (0.20 + 0.02 + 0.09 + 0.082) x 1.25 = 0.49 and the other at 0,60: (0.2 + 0.09 + 0.082 + 0.108) x 1.25.
const PARTS = {
  energy: 0.2,
  markup: 0.02,
  grid: 0.09,
  taxes: 0.082,
  vat: 0.098,
  total: 0.49,
  gridSet: true,
}
const OTHER_PARTS = {
  energy: 0.3,
  markup: 0,
  grid: 0.09,
  taxes: 0.082,
  vat: 0.1,
  total: 0.6,
  gridSet: true,
}

function currentHourStart() {
  return new Date(Math.floor(Date.now() / HOUR) * HOUR)
}

/** Prices for the Oslo day where the current hour has the given rate and every other hour is `other`. */
function dayPrices(currentRate: number | null, other: number) {
  const start = osloDayStartUtc(new Date()).getTime()
  const now = currentHourStart().getTime()
  return {
    date: '2026-11-13',
    zone: 'NO1',
    pricingModel: 'Spot',
    items: Array.from({ length: 24 }, (_, i) => {
      const hourStart = start + i * HOUR
      return {
        hourStart: new Date(hourStart).toISOString(),
        ratePerKwh: 0.5,
        spotRatePerKwh: hourStart === now ? currentRate : other + i * 0.001,
      }
    }),
  }
}

interface Setup {
  pricingModel?: 'Spot' | 'NorgesPris'
  actual?: { ratePerKwh: number; costSoFar: number; cap?: CapSplit | null } | null
  kwh?: number
  prices?: ReturnType<typeof dayPrices>
  yesterdayCost?: number | null
  withReading?: boolean
  stale?: boolean
  /** ISO time of the latest reading; defaults to a few seconds ago. */
  measuredAt?: string
  /** The API sends the parts of the price (the full-price calculation). */
  withParts?: boolean
  /** The location has a car charger. */
  hasEvCharger?: boolean
}

function renderNow({
  pricingModel = 'Spot',
  actual = { ratePerKwh: 0.49, costSoFar: 0.67 },
  kwh = 1.37,
  prices = dayPrices(0.4, 1),
  yesterdayCost = 100,
  withReading = true,
  stale = false,
  measuredAt,
  withParts = false,
  hasEvCharger = false,
}: Setup = {}) {
  server.use(
    http.get('*/api/electricity-cost/current', () =>
      HttpResponse.json({
        hourStart: currentHourStart().toISOString(),
        consumptionKwhSoFar: kwh,
        pricingModel,
        actual: actual && withParts ? { ...actual, parts: PARTS } : actual,
        comparison: actual
          ? { ratePerKwh: 0.6, costSoFar: 0.9, ...(withParts ? { parts: OTHER_PARTS } : {}) }
          : null,
      }),
    ),
    http.get('*/api/measurements/latest', () =>
      withReading
        ? HttpResponse.json({
            timestamp:
              measuredAt ?? new Date(Date.now() - (stale ? 5 * 60_000 : 5_000)).toISOString(),
            meterId: 'm1',
            powerWatts: 3420,
            isStale: stale,
          })
        : new HttpResponse(null, { status: 204 }),
    ),
    http.get('*/api/electricity-cost/prices', () => HttpResponse.json(prices)),
    http.get('*/api/electricity-cost/hourly', () =>
      HttpResponse.json({
        items:
          yesterdayCost === null
            ? []
            : [
                {
                  hourStart: currentHourStart().toISOString(),
                  consumptionKwh: 2,
                  pricingModel: 'Spot',
                  actual: { ratePerKwh: 1, cost: yesterdayCost },
                  comparison: null,
                },
              ],
        page: 1,
        pageSize: 500,
        totalCount: 1,
      }),
    ),
  )
  return renderWithQuery(
    <AuthContext.Provider value={USER}>
      <MemoryRouter>
        <NowCard locationId="l1" hasEvCharger={hasEvCharger} />
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('NowCard', () => {
  it('shows power, cost so far, the price per kWh and a cheap pill', async () => {
    renderNow()

    expect(await screen.findByText('3,42')).toBeInTheDocument()
    expect(screen.getByText('kW')).toBeInTheDocument()
    expect(screen.getByText(/0,67/)).toBeInTheDocument()
    expect(screen.getByText(/0,49/)).toBeInTheDocument()
    expect(await screen.findByText('Cheap now')).toBeInTheDocument()
  })

  it('calls an hour among the most expensive of the day expensive', async () => {
    renderNow({ prices: dayPrices(5, 1) })

    expect(await screen.findByText('Expensive now')).toBeInTheDocument()
  })

  it('shows the trend against the same hour yesterday', async () => {
    renderNow({ yesterdayCost: 100 })

    expect(await screen.findByText(/less than/)).toBeInTheDocument()
  })

  it('shows a rising trend when this hour costs more', async () => {
    renderNow({ actual: { ratePerKwh: 0.49, costSoFar: 5 }, yesterdayCost: 0.01 })

    expect(await screen.findByText(/more than/)).toBeInTheDocument()
  })

  it('hides the trend when yesterday has no data', async () => {
    renderNow({ yesterdayCost: null })

    await screen.findByText('3,42')
    expect(screen.queryByText(/less than|more than/)).not.toBeInTheDocument()
  })

  it('keeps showing power and says the price is missing when no price is available yet', async () => {
    renderNow({ actual: null, prices: dayPrices(null, 1) })

    expect(await screen.findByText('3,42')).toBeInTheDocument()
    expect(screen.getByText('Price not available yet')).toBeInTheDocument()
    expect(screen.getByText(/Cost and price level appear as soon as/)).toBeInTheDocument()
  })

  it('shows the time of the latest reading with seconds', async () => {
    renderNow({ measuredAt: '2026-11-13T11:34:56Z' }) // 12:34:56 in Oslo (winter time)

    expect(await screen.findByText(/Right now · 12:34:56/)).toBeInTheDocument()
  })

  it('says what the prices include and that the monthly fee and the capacity charge are not in them', async () => {
    renderNow()

    expect(
      await screen.findByText(
        "Prices include VAT, the grid charge and taxes. The supplier's monthly fee is not included; the grid capacity charge is shown in its own card. The expected bill for the month includes both.",
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText(/grid fixed fee/)).not.toBeInTheDocument()
  })

  it('offers no "What is in the price" button when the API sent no parts', async () => {
    renderNow()
    await screen.findByText('Cost this hour')

    expect(screen.queryByRole('button', { name: 'What is in the price' })).not.toBeInTheDocument()
  })

  it('offers the button when the API sent the parts, and the total matches the rate on the card', async () => {
    const u = userEvent.setup()
    renderNow({ withParts: true })

    await u.click(await screen.findByRole('button', { name: 'What is in the price' }))
    const dialog = await screen.findByRole('dialog', { name: 'What is in the price' })

    const total = within(dialog).getByText('Total, incl. VAT').closest('tr')!
    expect(total).toHaveTextContent('0,49 kr/kWh') // the rate under the plan, as on the card
    expect(screen.getAllByText(/0,49/).length).toBeGreaterThan(1)
  })

  it('shows no button while the price is unknown, even with parts', async () => {
    renderNow({ actual: null, prices: dayPrices(null, 1), withParts: true })
    await screen.findByText('Price not available yet')

    expect(screen.queryByRole('button', { name: 'What is in the price' })).not.toBeInTheDocument()
  })

  it('shows the cost this hour and the spot price now beside the power', async () => {
    renderNow()

    expect(await screen.findByText('Cost this hour')).toBeInTheDocument()
    expect(screen.getByText('Spot price now')).toBeInTheDocument()
    expect(screen.getByText(/0,49/)).toBeInTheDocument() // a Spot plan: its own rate is the spot price
    expect(screen.queryByText(/Your plan: Norgespris/)).not.toBeInTheDocument()
  })

  it('shows the real spot price, not the flat Norgespris rate, for a Norgespris location', async () => {
    renderNow({ pricingModel: 'NorgesPris', actual: { ratePerKwh: 0.5, costSoFar: 0.7 } })

    expect(await screen.findByText('Spot price now')).toBeInTheDocument()
    expect(screen.getByText(/0,60/)).toBeInTheDocument() // the market rate (the comparison)
    expect(screen.getByText(/Your plan: Norgespris 0,50/)).toBeInTheDocument()
  })

  it('says the spot price is not available yet when it is unknown', async () => {
    renderNow({ actual: null, prices: dayPrices(null, 1) })

    expect(await screen.findByText('No spot price yet')).toBeInTheDocument()
  })

  it('shows the card as offline when the API says the latest reading is stale', async () => {
    renderNow({ stale: true })

    expect(await screen.findByText(/Offline · last reading/)).toBeInTheDocument()
    expect(screen.queryByText('3,42')).not.toBeInTheDocument()
  })

  it('shows an empty state when the location has no readings', async () => {
    renderNow({ actual: null, kwh: 0, withReading: false, prices: dayPrices(null, 1) })

    expect(await screen.findByText('No readings yet')).toBeInTheDocument()
  })

  describe('the Norgespris monthly limit', () => {
    const cap: CapSplit = {
      kwhWithinCap: 1.2,
      kwhAboveCap: 0.8,
      aboveCapParts: { ...PARTS, gridSet: true },
    }
    const LIMIT = /The Norgespris monthly limit is reached/

    it('says the limit is reached on a Norgespris location with kWh above it', async () => {
      renderNow({ pricingModel: 'NorgesPris', actual: { ratePerKwh: 1.224, costSoFar: 2.4, cap } })

      expect(await screen.findByText(LIMIT)).toBeInTheDocument()
    })

    it('says nothing when no kWh are above the limit', async () => {
      renderNow({
        pricingModel: 'NorgesPris',
        actual: { ratePerKwh: 0.9, costSoFar: 1, cap: null },
      })
      expect(await screen.findByText(/Your plan: Norgespris/)).toBeInTheDocument()
      expect(screen.queryByText(LIMIT)).not.toBeInTheDocument()
    })

    it('says nothing on a spot location', async () => {
      renderNow({ pricingModel: 'Spot', actual: { ratePerKwh: 1.5, costSoFar: 2, cap } })
      expect(await screen.findByText(/Prices include VAT/)).toBeInTheDocument()
      expect(screen.queryByText(LIMIT)).not.toBeInTheDocument()
    })
  })
})

describe('NowCard: the car charging now (spec 017)', () => {
  const LINE = /^Car charging now: 4,4 kW · 13,0 kWh this charge · since (24\.11\. )?16:37$/

  it('shows the car line while the car charges, and leaves the house figures as they are', async () => {
    server.use(serveLiveState(liveState()).handler)
    renderNow({ hasEvCharger: true })

    expect(await screen.findByText(LINE)).toBeInTheDocument()
    expect(screen.getByText('3,42')).toBeInTheDocument()
    expect(screen.getByText(/0,67/)).toBeInTheDocument()
  })

  it.each(['connected', 'finished', 'noCar', 'offline'] as const)(
    'shows no car line when %s',
    async (state) => {
      const live = serveLiveState(liveState({ state, ...LIVE_STATES[state] }))
      server.use(live.handler)
      renderNow({ hasEvCharger: true })

      expect(await screen.findByText('3,42')).toBeInTheDocument()
      await vi.waitFor(() => expect(live.calls.state).toBe(1))
      expect(screen.queryByText(/Car charging now/)).not.toBeInTheDocument()
    },
  )

  it('shows no car line when the state is unavailable', async () => {
    const live = serveLiveState({ status: 503, code: 'EvCharger.Unavailable' })
    server.use(live.handler)
    renderNow({ hasEvCharger: true })

    expect(await screen.findByText('3,42')).toBeInTheDocument()
    await vi.waitFor(() => expect(live.calls.state).toBe(1))
    expect(screen.queryByText(/Car charging now/)).not.toBeInTheDocument()
  })

  it('never asks for the state of a location without a charger', async () => {
    const live = serveLiveState()
    server.use(live.handler)
    renderNow()

    expect(await screen.findByText('Cheap now')).toBeInTheDocument()
    expect(live.calls.state).toBe(0)
    expect(screen.queryByText(/Car charging now/)).not.toBeInTheDocument()
  })
})
