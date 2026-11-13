import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/server'
import { renderWithQuery } from '../../test/render'
import { osloDayStartUtc } from './format'
import { NowCard } from './NowCard'

const HOUR = 3_600_000

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
        ratePerKwh: hourStart === now ? currentRate : other + i * 0.001,
      }
    }),
  }
}

interface Setup {
  pricingModel?: 'Spot' | 'NorgesPris'
  actual?: { ratePerKwh: number; costSoFar: number } | null
  kwh?: number
  prices?: ReturnType<typeof dayPrices>
  yesterdayCost?: number | null
  withReading?: boolean
}

function renderNow({
  pricingModel = 'Spot',
  actual = { ratePerKwh: 0.49, costSoFar: 0.67 },
  kwh = 1.37,
  prices = dayPrices(0.4, 1),
  yesterdayCost = 100,
  withReading = true,
}: Setup = {}) {
  const minute = new Date(Math.floor(Date.now() / 60_000) * 60_000 - 60_000)
  server.use(
    http.get('*/api/electricity-cost/current', () =>
      HttpResponse.json({
        hourStart: currentHourStart().toISOString(),
        consumptionKwhSoFar: kwh,
        pricingModel,
        actual,
        comparison: actual ? { ratePerKwh: 0.6, costSoFar: 0.9 } : null,
      }),
    ),
    http.get('*/api/consumption', () =>
      HttpResponse.json({
        granularity: 'minute',
        items: withReading ? [{ periodStart: minute.toISOString(), consumptionKwh: 0.057 }] : [],
      }),
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
  return renderWithQuery(<NowCard locationId="l1" />)
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

  it('shows the real (spot) price next to Norgespris for a Norgespris location', async () => {
    renderNow({ pricingModel: 'NorgesPris', actual: { ratePerKwh: 0.5, costSoFar: 0.7 } })

    expect(await screen.findByText('Norgespris per kWh')).toBeInTheDocument()
    expect(screen.getByText('Spot price now (the market price)')).toBeInTheDocument()
    expect(screen.getByText(/0,60/)).toBeInTheDocument()
  })

  it('does not repeat the spot price for a Spot location', async () => {
    renderNow()

    await screen.findByText('Price per kWh')
    expect(screen.queryByText(/Spot price now/)).not.toBeInTheDocument()
  })

  it('shows an empty state when the location has no readings', async () => {
    renderNow({ actual: null, kwh: 0, withReading: false, prices: dayPrices(null, 1) })

    expect(await screen.findByText('No readings yet')).toBeInTheDocument()
  })
})
