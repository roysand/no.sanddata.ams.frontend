import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext, type AuthContextValue } from '../auth/context'
import { server } from '../../test/server'
import { renderWithQuery } from '../../test/render'
import { LIVE_STATES, liveState, serveLiveState } from '../../test/evCharger'
import { osloToday } from './format'
import { EvChargerPage } from './EvChargerPage'
import type { DailyCostItem, EvChargerDayPart, EvChargerLiveState, EvChargerSession } from './types'

const authAs = (roles: string[]): AuthContextValue => ({
  isAuthenticated: true,
  isLoading: false,
  email: 'someone@sanddata.no',
  roles,
  login: async () => {},
  logout: () => {},
})

const location = (patch: Record<string, unknown> = {}) => ({
  id: 'l1',
  name: 'Hjemme',
  address: 'Gata 1',
  zone: 'NO1',
  serialNumber: 'SN-l1',
  hasNorgesPriceAgreement: false,
  isActive: true,
  role: 'Owner',
  meters: [],
  hasEvCharger: true,
  includeEvCharger: false,
  ...patch,
})

const TODAY = osloToday()
const MONTH_START = `${TODAY.slice(0, 7)}-01`

const part = (kwh: number, hoursWithoutMeterReading = 0): EvChargerDayPart => ({
  kwh,
  estimated: false,
  included: false,
  hoursWithoutMeterReading,
})

const day = (date: string, evCharger: EvChargerDayPart | null): DailyCostItem => ({
  date,
  consumptionKwh: 30,
  totalKwh: 30,
  pricingModel: 'Spot',
  actual: { cost: 30 },
  comparison: null,
  waterHeater: null,
  evCharger,
})

/** Charging on the 1st (2 kWh) and today (5 kWh), unless today is the 1st. */
const defaultDays = () =>
  TODAY === MONTH_START ? [day(TODAY, part(7))] : [day(MONTH_START, part(2)), day(TODAY, part(5))]

const SESSIONS: EvChargerSession[] = [
  { start: '2026-11-20T16:02:11Z', end: '2026-11-20T20:40:03Z', kwh: 23.418, estimated: false },
  { start: '2026-11-18T22:10:00Z', end: '2026-11-19T01:30:00Z', kwh: 12.5, estimated: true },
]

function serve({
  locations = [location()],
  days = defaultDays(),
  sessions = SESSIONS,
  daily,
  live = liveState(),
}: {
  locations?: ReturnType<typeof location>[]
  days?: DailyCostItem[]
  sessions?: EvChargerSession[]
  daily?: () => Response
  live?: Parameters<typeof serveLiveState>[0]
} = {}) {
  const state = serveLiveState(live)
  const calls = {
    daily: 0,
    sessions: 0,
    locations: 0,
    get state() {
      return state.calls.state
    },
  }
  server.use(
    state.handler,
    http.get('*/api/locations', () => {
      calls.locations++
      return HttpResponse.json(locations)
    }),
    http.get('*/api/electricity-cost/daily', () => {
      calls.daily++
      return daily ? daily() : HttpResponse.json({ items: days })
    }),
    http.get('*/api/locations/:id/ev-charger/sessions', () => {
      calls.sessions++
      return HttpResponse.json({ items: sessions })
    }),
  )
  return calls
}

function renderPage(roles = ['User']) {
  return renderWithQuery(
    <AuthContext.Provider value={authAs(roles)}>
      <MemoryRouter initialEntries={['/ev-charger']}>
        <EvChargerPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

const charging = () => screen.getByRole('region', { name: 'Charging' })
const rowText = (term: string) =>
  within(charging()).getByText(term, { selector: 'dt' }).nextElementSibling?.textContent ?? ''

describe('EvChargerPage', () => {
  beforeEach(() => localStorage.clear())

  it("shows today's and this month's charging in kWh, never in kr", async () => {
    serve()
    renderPage()

    expect((await screen.findAllByText('7 kWh')).length).toBeGreaterThan(0)
    expect(rowText('This month')).toBe('7 kWh')
    expect(rowText('Today')).toBe(TODAY === MONTH_START ? '7 kWh' : '5 kWh')
    expect(charging().textContent).not.toMatch(/kr/)
  })

  it('says since when the month began after the 1st', async () => {
    const third = `${TODAY.slice(0, 7)}-03`
    if (TODAY < third) return // Only meaningful from the 3rd of the month on.
    serve({ days: [day(third, part(2)), day(TODAY, part(5))] })
    renderPage()

    expect(await screen.findByText(/^since 03\.\d\d\.\d{4}$/)).toBeInTheDocument()
  })

  it('says there is no charging yet, never 0 kWh', async () => {
    serve({ days: [day(TODAY, null)], sessions: [] })
    renderPage()

    expect(await screen.findAllByText('No charging yet')).toHaveLength(2)
    expect(screen.queryByText(/^0 kWh/)).not.toBeInTheDocument()
  })

  it('says how many charging hours had no house reading, only when there were some', async () => {
    serve({ days: [day(TODAY, part(5, 3))] })
    renderPage()

    expect(
      await screen.findByText(
        '3 hours of charging had no house reading and are not in the hour-by-hour chart.',
      ),
    ).toBeInTheDocument()
  })

  it('has no such line when every charging hour had a house reading', async () => {
    serve()
    renderPage()

    await screen.findAllByText('7 kWh')
    expect(screen.queryByText(/had no house reading/)).not.toBeInTheDocument()
  })

  it('explains that finished charges show up after they end, and points to the state', async () => {
    serve()
    renderPage()

    expect(
      await screen.findByText(
        "Finished charges show here about 15 minutes after they end. The charger's state right now is at the top.",
      ),
    ).toBeInTheDocument()
  })

  it('lists the sessions newest first, with times, kWh and duration, and marks estimates', async () => {
    serve()
    renderPage()

    const list = await screen.findByRole('list', { name: 'Charging sessions' })
    const rows = within(list).getAllByRole('listitem')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('Fri 20.11 · 17:02–21:40')
    expect(rows[0]).toHaveTextContent('23,42 kWh')
    expect(rows[0]).toHaveTextContent('4 h 38 min')
    expect(within(rows[0]).queryByText('estimated')).not.toBeInTheDocument()
    expect(rows[1]).toHaveTextContent('Wed 18.11 · 23:10–19.11 02:30')
    expect(within(rows[1]).getByText('estimated')).toBeInTheDocument()
  })

  it('says when there are no sessions in the last 30 days', async () => {
    serve({ sessions: [] })
    renderPage()

    expect(
      await screen.findByText('No completed charging sessions in the last 30 days.'),
    ).toBeInTheDocument()
  })

  it('says so for a location without a charger, and asks for nothing', async () => {
    const calls = serve({ locations: [location({ hasEvCharger: false })] })
    renderPage()

    expect(await screen.findByText(/No car charger is connected at Hjemme/)).toBeInTheDocument()
    expect(calls.daily).toBe(0)
    expect(calls.sessions).toBe(0)
    expect(calls.state).toBe(0)
  })

  it('keeps the sessions when the figures fail', async () => {
    serve({
      daily: () =>
        HttpResponse.json({ errors: { generalErrors: ['Daily failed'] } }, { status: 500 }),
    })
    renderPage()

    expect(await screen.findByText('Daily failed')).toBeInTheDocument()
    expect(await screen.findByRole('list', { name: 'Charging sessions' })).toBeInTheDocument()
  })
})

describe('EvChargerPage: count the car charger with the house', () => {
  beforeEach(() => localStorage.clear())

  /** Serves the page, and `include` answers the checkbox's PUT. */
  function serveInclude(
    include: (body: { include: boolean }) => Response | Promise<Response>,
    patch: Record<string, unknown> = {},
  ) {
    const bodies: unknown[] = []
    const calls = serve({ locations: [location(patch)] })
    server.use(
      http.put('*/api/locations/:id/ev-charger/include', async ({ request }) => {
        const body = (await request.json()) as { include: boolean }
        bodies.push(body)
        return include(body)
      }),
    )
    return { bodies, calls }
  }

  const checkbox = () =>
    screen.findByRole('checkbox', { name: 'Count the car charger with the house' })

  it('shows the setting and says the car is counted in kWh only', async () => {
    serve()
    renderPage()

    expect(await checkbox()).not.toBeChecked()
    expect(
      screen.getByText("In kWh only. Costs and the bill stay the house's own."),
    ).toBeInTheDocument()
  })

  it('saves a change at once and loads the locations again', async () => {
    const user = userEvent.setup()
    let release: () => void = () => {}
    const { bodies, calls } = serveInclude(
      () =>
        new Promise((resolve) => {
          release = () => resolve(HttpResponse.json({ locationId: 'l1', includeInTotals: true }))
        }),
    )
    renderPage()
    const box = await checkbox()
    const before = calls.locations

    await user.click(box)

    // While saving, the box shows the value being sent.
    expect(box).toBeChecked()
    expect(bodies).toEqual([{ include: true }])
    expect(screen.getByRole('status')).toHaveTextContent('Saving…')
    release()
    await waitFor(() => expect(calls.locations).toBeGreaterThan(before))
    expect(await screen.findByText('Saved')).toBeInTheDocument()
  })

  it("goes back and shows the API's message when saving fails", async () => {
    const user = userEvent.setup()
    serveInclude(() =>
      HttpResponse.json(
        { errors: { generalErrors: ['No car charger is connected'] } },
        { status: 400 },
      ),
    )
    renderPage()
    const box = await checkbox()

    await user.click(box)

    expect(await screen.findByText('No car charger is connected')).toBeInTheDocument()
    expect(box).not.toBeChecked()
    expect(screen.queryByText('Saved')).not.toBeInTheDocument()
  })

  it('is read-only for a viewer', async () => {
    serve({ locations: [location({ role: 'Viewer', includeEvCharger: true })] })
    renderPage()

    const box = await checkbox()
    expect(box).toBeChecked()
    expect(box).toBeDisabled()
    expect(screen.getByText('Only the owner can change this.')).toBeInTheDocument()
  })

  it('can be changed by an administrator who views the location', async () => {
    const user = userEvent.setup()
    const { bodies } = serveInclude(
      () => HttpResponse.json({ locationId: 'l1', includeInTotals: true }),
      { role: 'Viewer' },
    )
    renderPage(['Admin'])

    const box = await checkbox()
    expect(box).toBeEnabled()
    await user.click(box)
    await waitFor(() => expect(bodies).toEqual([{ include: true }]))
  })
})

describe('EvChargerPage: the charger now (spec 017)', () => {
  const live = (state: EvChargerLiveState['state']) => liveState({ state, ...LIVE_STATES[state] })
  const tile = () => screen.findByRole('region', { name: 'Charger now' })
  // The fixture's times are on 2026-11-24; on a later day they also carry the date.
  const onDay = '(24\\.11\\. )?'

  it('shows a charge with its figures, the moving line and how long ago it was read', async () => {
    serve()
    renderPage()

    const now = await tile()
    expect(within(now).getByText('Charging')).toBeInTheDocument()
    expect(now).toHaveTextContent(
      new RegExp(
        `4,4 kW · 13,0 kWh this charge · charging since ${onDay}16:37 · plugged in at ${onDay}15:52`,
      ),
    )
    expect(within(now).getByText(/^updated /)).toBeInTheDocument()
    const picture = within(now).getByRole('img', { name: 'A car charging from the charger' })
    expect(within(picture).getByTestId('cable-flow')).toBeInTheDocument()
  })

  it('shows a connected car without power or a moving line', async () => {
    serve({ live: live('connected') })
    renderPage()

    const now = await tile()
    expect(await within(now).findByText('Connected, not charging')).toBeInTheDocument()
    expect(now).not.toHaveTextContent('kW ·')
    const picture = within(now).getByRole('img', {
      name: 'A car connected to the charger, not charging',
    })
    expect(within(picture).queryByTestId('cable-flow')).not.toBeInTheDocument()
  })

  it('shows a finished charge with its kWh', async () => {
    serve({ live: live('finished') })
    renderPage()

    const now = await tile()
    expect(await within(now).findByText('Finished charging')).toBeInTheDocument()
    expect(now).toHaveTextContent('24,6 kWh this charge')
  })

  it('shows no car and no figures when none is connected', async () => {
    serve({ live: live('noCar') })
    renderPage()

    const now = await tile()
    expect(await within(now).findByText('No car connected')).toBeInTheDocument()
    expect(now).not.toHaveTextContent('kWh')
    expect(
      within(now).getByRole('img', { name: 'The charger with no car connected' }),
    ).toBeInTheDocument()
  })

  it('shows an offline charger with when it last reported', async () => {
    serve({ live: live('offline') })
    renderPage()

    const now = await tile()
    expect(await within(now).findByText('Offline')).toBeInTheDocument()
    expect(now).toHaveTextContent(new RegExp(`last reported ${onDay}14:10`))
  })

  it('shows a state it does not know as unknown', async () => {
    // The API may add states later; the cast sends one the type doesn't allow.
    serve({ live: { ...live('unknown'), state: 'paused' } as unknown as EvChargerLiveState })
    renderPage()

    expect(await within(await tile()).findByText('Status unknown')).toBeInTheDocument()
  })

  it('says the state is unavailable when it cannot be read, and keeps the rest of the tab', async () => {
    serve({ live: { status: 503, code: 'EvCharger.Unavailable' } })
    renderPage()

    const now = await tile()
    expect(
      await within(now).findByText("The charger's state is unavailable right now."),
    ).toBeInTheDocument()
    expect(within(now).queryByTestId('cable-flow')).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Charging' })).toBeInTheDocument()
  })

  it('shows no tile when the location has no charger after all', async () => {
    serve({ live: live('noCharger') })
    renderPage()

    expect(await screen.findByRole('region', { name: 'Charging' })).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.queryByLabelText("Loading the charger's state")).not.toBeInTheDocument(),
    )
    expect(screen.queryByRole('region', { name: 'Charger now' })).not.toBeInTheDocument()
  })
})
