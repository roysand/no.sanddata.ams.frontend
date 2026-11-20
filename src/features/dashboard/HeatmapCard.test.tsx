import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { renderWithQuery } from '../../test/render'
import { server } from '../../test/server'
import { plain } from '../../test/text'
import { heatmapDays } from './heatmap'
import { HeatmapCard } from './HeatmapCard'
import { dayStart } from './periods'
import type { HourlyCostItem } from './types'

const osloWeekday = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Oslo', weekday: 'short' })

/** 1 kWh every hour, but 3 kWh on Mondays 18–19 and 0.2 kWh on Wednesdays 03–04. */
function hours(days: string[]): HourlyCostItem[] {
  return days.flatMap((date) => {
    const start = dayStart(date).getTime()
    const weekday = osloWeekday.format(new Date(`${date}T12:00:00Z`))
    return Array.from({ length: 24 }, (_, h) => ({
      hourStart: new Date(start + h * 3_600_000).toISOString(),
      consumptionKwh: weekday === 'Mon' && h === 18 ? 3 : weekday === 'Wed' && h === 3 ? 0.2 : 1,
      totalKwh: weekday === 'Mon' && h === 18 ? 3 : weekday === 'Wed' && h === 3 ? 0.2 : 1,
      pricingModel: 'Spot' as const,
      actual: null,
      comparison: null,
      waterHeater: null,
      evCharger: null,
    }))
  })
}

function serve(answer: HourlyCostItem[] | Response) {
  const requests: URLSearchParams[] = []
  server.use(
    http.get('*/api/electricity-cost/hourly', ({ request }) => {
      requests.push(new URL(request.url).searchParams)
      return answer instanceof Response
        ? answer
        : HttpResponse.json({ items: answer, page: 1, pageSize: 1000, totalCount: answer.length })
    }),
  )
  return requests
}

// Clock changes make some days 23 or 25 hours; this data keeps 24 per day, which is enough for these tests.
const days = heatmapDays(new Date())

describe('HeatmapCard', () => {
  it('names the hours with the most and the least use', async () => {
    const requests = serve(hours(days))
    renderWithQuery(<HeatmapCard locationId="l1" />)

    expect(await screen.findByText('Mondays 18–19')).toBeInTheDocument()
    expect(plain(screen.getByText(/^Most use:/).textContent)).toBe(
      'Most use: Mondays 18–19, 3 kWh. Least: Wednesdays 03–04, 0,2 kWh.',
    )
    // 4 finished weeks in one page.
    expect(requests[0].get('from')).toBe(dayStart(days[0]).toISOString())
    expect(requests[0].get('pageSize')).toBe('1000')
  })

  it('gives every hour of every weekday in a table for screen readers', async () => {
    serve(hours(days))
    renderWithQuery(<HeatmapCard locationId="l1" />)
    await screen.findByText('Mondays 18–19')

    const table = screen.getByRole('table', {
      name: 'Average kWh in each hour of each weekday, the last 4 weeks',
    })
    const header = within(table)
      .getAllByRole('columnheader')
      .map((th) => th.textContent)
    expect(header).toEqual(['Hour', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
    const evening = within(table).getByRole('rowheader', { name: '18–19' }).closest('tr')!
    expect(
      within(evening)
        .getAllByRole('cell')
        .map((td) => plain(td.textContent)),
    ).toEqual(['3 kWh', '1 kWh', '1 kWh', '1 kWh', '1 kWh', '1 kWh', '1 kWh'])
  })

  it('shows the value of a square when it is touched', async () => {
    const user = userEvent.setup()
    serve(hours(days))
    renderWithQuery(<HeatmapCard locationId="l1" />)
    await screen.findByText('Mondays 18–19')
    expect(screen.getByText('Touch a square to see its value.')).toBeInTheDocument()

    await user.click(screen.getByTitle('Wednesdays 03–04: 0,2 kWh'))

    expect(plain(screen.getByText(/on average/).closest('p')!.textContent)).toBe(
      'Wednesdays 03–04 · 0,2 kWh on average',
    )
  })

  it('says so when there are no readings', async () => {
    serve([])
    renderWithQuery(<HeatmapCard locationId="l1" />)
    expect(await screen.findByText('No readings in the last 4 weeks.')).toBeInTheDocument()
  })

  it('shows the server message when the hours cannot be loaded', async () => {
    serve(HttpResponse.json({ message: 'Something broke' }, { status: 500 }))
    renderWithQuery(<HeatmapCard locationId="l1" />)
    expect(await screen.findByText('Something broke')).toBeInTheDocument()
  })
})
