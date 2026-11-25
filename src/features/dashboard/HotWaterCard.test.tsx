import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse } from 'msw'
import { server } from '../../test/server'
import { renderWithQuery } from '../../test/render'
import { answer, hotWaterDay, serveHotWater } from '../../test/hotWater'
import { osloToday } from './format'
import { HotWaterCard } from './HotWaterCard'
import { hotWaterView, mondayOf } from './hotWater'
import { addDays, dayStart } from './periods'
import type { HotWaterPeriod } from './types'

const plain = (text: string | null | undefined) => (text ?? '').replace(/\s/g, ' ')

/** Any period's answer with no litres, with `from`/`to` around its date. */
const empty = (period: HotWaterPeriod, date: string) =>
  answer(period, dayStart(date).toISOString(), dayStart(addDays(date, 1)).toISOString())

/** Today with a shower in the first hour (so it is always before now), and the day's other hours 0 L. */
const today = (extra: Parameters<typeof hotWaterDay>[2] = {}) =>
  hotWaterDay(osloToday(), { 0: 38 }, extra)

function renderCard() {
  return renderWithQuery(<HotWaterCard locationId="l1" />)
}

const card = () => screen.findByRole('region', { name: 'Hot water used' })

describe('HotWaterCard (spec 018)', () => {
  it("shows today's total so far and a chart named by its total and largest hour", async () => {
    const served = serveHotWater((period, date) =>
      period === 'day' ? today() : empty(period, date),
    )
    server.use(served.handler)
    renderCard()

    const region = await card()
    expect(await within(region).findByText('38 L')).toBeInTheDocument()
    expect(plain(region.textContent)).toContain('Total V40 used 38 L so far')
    expect(
      within(region).getByRole('figure', {
        name: 'Hot water used, Today: 38 L in total, most at 00:00–01:00',
      }),
    ).toBeInTheDocument()
    expect(served.asked[0]).toEqual({ period: 'day', date: osloToday() })
    expect(within(region).getByText('Today')).toBeInTheDocument()
  })

  it('explains V40 and why the total can be higher than the OSO app', async () => {
    server.use(serveHotWater(() => today()).handler)
    renderCard()

    expect(
      await within(await card()).findByText(/Small draws, such as a hand wash, are counted/),
    ).toBeInTheDocument()
  })

  it('says when an hour is partly recorded, only then', async () => {
    server.use(serveHotWater(() => today({ sampled: { 0: 20 } })).handler)
    const { unmount } = renderCard()

    expect(
      await within(await card()).findByText('Paler: partly recorded, likely too low'),
    ).toBeInTheDocument()
    unmount()

    server.use(serveHotWater(() => today()).handler)
    renderCard()
    await within(await card()).findByText(/Total V40 used/)
    expect(screen.queryByText('Paler: partly recorded, likely too low')).not.toBeInTheDocument()
  })

  it('says nothing is recorded yet today, never 0 L', async () => {
    server.use(serveHotWater((period, date) => empty(period, date)).handler)
    renderCard()

    expect(
      await within(await card()).findByText('No hot water recorded yet today.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/0 L/)).not.toBeInTheDocument()
  })

  it('shows the week by its Monday, steps back a week, and keeps Next off at now', async () => {
    const user = userEvent.setup()
    const served = serveHotWater((period, date) =>
      period === 'week'
        ? answer('week', dayStart(date).toISOString(), dayStart(addDays(date, 7)).toISOString(), [
            { start: dayStart(date).toISOString(), litres: 120, sampledMinutes: 1440 },
          ])
        : today(),
    )
    server.use(served.handler)
    renderCard()
    const region = await card()

    await user.click(within(region).getByRole('button', { name: 'Week' }))
    expect(await within(region).findByText('This week')).toBeInTheDocument()
    const monday = mondayOf(osloToday())
    await waitFor(() => expect(served.asked).toContainEqual({ period: 'week', date: monday }))
    expect(await within(region).findByText(/^120 L$/)).toBeInTheDocument()
    expect(within(region).getByRole('button', { name: 'Next week' })).toBeDisabled()

    const previous = within(region).getByRole('button', { name: 'Previous week' })
    if (!hotWaterView('week', 0, new Date()).canGoBack) {
      // This week holds the first recorded day: there is nothing before it.
      expect(previous).toBeDisabled()
      return
    }
    await user.click(previous)
    await waitFor(() =>
      expect(served.asked).toContainEqual({ period: 'week', date: addDays(monday, -7) }),
    )
    expect(
      await within(region).findByText(hotWaterView('week', -1, new Date()).title),
    ).toBeInTheDocument()
    expect(within(region).getByRole('button', { name: 'Next week' })).toBeEnabled()
  })

  it('starts each period at the current one', async () => {
    const user = userEvent.setup()
    const served = serveHotWater((period, date) => empty(period, date))
    server.use(served.handler)
    renderCard()
    const region = await card()

    await user.click(within(region).getByRole('button', { name: 'Year' }))
    const year = osloToday().slice(0, 4)
    expect(await within(region).findByText(year)).toBeInTheDocument()
    await waitFor(() =>
      expect(served.asked).toContainEqual({ period: 'year', date: `${year}-01-01` }),
    )
    expect(
      await within(region).findByText(
        `No hot water recorded for ${year}. The record starts on 24 Nov 2026.`,
      ),
    ).toBeInTheDocument()
  })

  it('says the hot water cannot be shown when the request fails, and keeps the switch', async () => {
    server.use(
      serveHotWater(() =>
        HttpResponse.json({ errors: { generalErrors: ['Boom'] } }, { status: 500 }),
      ).handler,
    )
    renderCard()

    const region = await card()
    expect(
      await within(region).findByText("The hot water used can't be shown right now."),
    ).toBeInTheDocument()
    expect(within(region).getByRole('button', { name: 'Week' })).toBeInTheDocument()
  })
})
