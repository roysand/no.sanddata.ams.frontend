import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { renderWithQuery } from '../../test/render'
import { server } from '../../test/server'
import { plain } from '../../test/text'
import { dayStart } from './periods'
import { standbyDays } from './standby'
import { StandbyCard } from './StandbyCard'
import type { HourlyCostItem } from './types'

/** Every day: 0.3 kWh at 03:00 and 1 kWh in the other hours, at 2 kr/kWh (or unpriced). */
function hours(days: string[], priced = true): HourlyCostItem[] {
  return days.flatMap((date) => {
    const start = dayStart(date).getTime()
    return Array.from({ length: 24 }, (_, h) => {
      const kwh = h === 3 ? 0.3 : 1
      return {
        hourStart: new Date(start + h * 3_600_000).toISOString(),
        consumptionKwh: kwh,
        totalKwh: kwh,
        pricingModel: 'Spot' as const,
        actual: priced ? { ratePerKwh: 2, cost: kwh * 2 } : null,
        comparison: null,
        waterHeater: null,
        evCharger: null,
      }
    })
  })
}

function serve(items: HourlyCostItem[] | Response) {
  const requests: URLSearchParams[] = []
  server.use(
    http.get('*/api/electricity-cost/hourly', ({ request }) => {
      requests.push(new URL(request.url).searchParams)
      return items instanceof Response
        ? items
        : HttpResponse.json({ items, page: 1, pageSize: 500, totalCount: items.length })
    }),
  )
  return requests
}

const text = () => plain(document.body.textContent)

describe('StandbyCard', () => {
  const days = standbyDays(new Date())

  it('shows the standby in watts, a year of it in kWh and kr, and its share of the use', async () => {
    const requests = serve(hours(days))
    renderWithQuery(<StandbyCard locationId="l1" />)

    expect(await screen.findByText('300 W')).toBeInTheDocument()
    expect(screen.getByText('always on, day and night')).toBeInTheDocument()
    // 0.3 kW x 8 760 h = 2 628 kWh, at 2 kr = 5 256 kr.
    expect(text()).toContain('About 2 628 kWh a year, or about 5 256 kr at your average price')
    expect(text()).toContain('2,00 kr/kWh')
    // 7.2 of 23.3 kWh a day.
    expect(text()).toContain('That is 31 % of your use in the last 14 days.')

    // The 14 finished days before today, and nothing of today.
    expect(requests[0].get('from')).toBe(dayStart(days[0]).toISOString())
    expect(requests[0].get('to')! < new Date().toISOString()).toBe(true)
  })

  it('lists the quietest hour of each day for screen readers', async () => {
    serve(hours(days))
    renderWithQuery(<StandbyCard locationId="l1" />)

    await screen.findByText('300 W')
    expect(
      screen.getByRole('figure', { name: 'The quietest hour of each of the last 14 days' }),
    ).toBeInTheDocument()
    expect(screen.getAllByText(/at 03:00: 300 W/)).toHaveLength(14)
  })

  it('leaves out the cost when there are no prices', async () => {
    serve(hours(days, false))
    renderWithQuery(<StandbyCard locationId="l1" />)

    await screen.findByText('300 W')
    expect(text()).toContain('About 2 628 kWh a year. That is')
    expect(text()).not.toContain('average price')
  })

  it('says so when there are too few days of readings', async () => {
    serve(hours(days.slice(-2)))
    renderWithQuery(<StandbyCard locationId="l1" />)

    expect(
      await screen.findByText(
        'Standby needs at least 3 full days of readings in the last 14 days.',
      ),
    ).toBeInTheDocument()
  })

  it('shows the server message when the hours cannot be loaded', async () => {
    serve(HttpResponse.json({ message: 'Something broke' }, { status: 500 }))
    renderWithQuery(<StandbyCard locationId="l1" />)

    expect(await screen.findByText('Something broke')).toBeInTheDocument()
  })
})
