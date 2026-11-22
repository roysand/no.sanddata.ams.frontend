import { act, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/server'
import { renderWithQuery } from '../../test/render'
import { plain } from '../../test/text'
import { formatClock } from './format'
import { WaterHeaterCard } from './WaterHeaterCard'
import type { WaterHeaterState } from './types'

// The heater at Hjemme as in the spec's independent test: 333 of 360 l, 3 showers, 1 bath, 70,1 °C, idle, 94 s old.
const STATE: WaterHeaterState = {
  locationId: 'loc-1',
  readingTime: '2026-11-19T18:06:48.703Z',
  ageSeconds: 94,
  isStale: false,
  isOnline: true,
  isHeating: false,
  setPointCelsius: 72,
  temperatures: { topCelsius: 70.1, midCelsius: 68.4, lowCelsius: 55.2, fourthCelsius: null },
  hotWater: {
    availableLitres40: 333,
    maxLitres40: 360,
    showers: 3,
    baths: 1,
    storedEnergyKwh: 13.97,
  },
  powerKw: 0.0117,
  specialMode: { mode: 'None', start: null, end: null, profileName: null },
  osoCodes: { controlMode: 0, optimizationOption: 1, optimizationSubOption: 2, profileId: 3 },
}

type Patch = Partial<Omit<WaterHeaterState, 'temperatures' | 'hotWater' | 'specialMode'>> & {
  temperatures?: Partial<WaterHeaterState['temperatures']>
  hotWater?: Partial<WaterHeaterState['hotWater']>
  specialMode?: Partial<WaterHeaterState['specialMode']>
}

const state = (patch: Patch = {}): WaterHeaterState => ({
  ...STATE,
  ...patch,
  temperatures: { ...STATE.temperatures, ...patch.temperatures },
  hotWater: { ...STATE.hotWater, ...patch.hotWater },
  specialMode: { ...STATE.specialMode, ...patch.specialMode },
})

const PATH = '*/api/locations/:id/water-heater'

function show(body: WaterHeaterState) {
  server.use(http.get(PATH, () => HttpResponse.json(body)))
  return renderWithQuery(<WaterHeaterCard locationId="loc-1" />)
}

const cardText = () => plain(screen.getByRole('region', { name: 'Water heater' }).textContent)

describe('WaterHeaterCard', () => {
  afterEach(() => vi.useRealTimers())

  it('shows the hot water, temperature and age of an idle heater', async () => {
    show(state())

    expect(await screen.findByText('of 360 l · 40 °C water')).toBeInTheDocument()
    const meter = screen.getByRole('meter', { name: 'Hot water' })
    expect(meter).toHaveAttribute('aria-valuenow', '333')
    expect(meter).toHaveAttribute('aria-valuemax', '360')
    const text = cardText()
    expect(text).toContain('3 showers')
    expect(text).toContain('1 bath')
    expect(text).toContain('70,1 °C')
    expect(text).toContain('Not heating')
    expect(text).toContain('updated 1 minute ago')
    expect(text).not.toContain('kW')
    expect(text).not.toMatch(/Holiday|Supercharge/)
  })

  it('leaves out values the heater does not give, never showing 0', async () => {
    show(
      state({
        temperatures: { midCelsius: null, lowCelsius: null },
        hotWater: { availableLitres40: null },
      }),
    )

    expect(await screen.findByText(/70,1/)).toBeInTheDocument()
    const text = cardText()
    expect(text).not.toMatch(/middle|bottom/)
    expect(text).not.toContain('0,0 °C')
    expect(text).not.toContain(' of 360 l')
    expect(screen.queryByRole('meter')).not.toBeInTheDocument()
  })

  it('draws the tank with its share of hot water and the sensor temperatures rounded', async () => {
    show(state())

    const meter = await screen.findByRole('meter', { name: 'Hot water' })
    expect(meter).toHaveAttribute('aria-valuetext', '333 of 360 l, 93 %')
    const text = plain(meter.textContent)
    expect(text).toContain('93%')
    expect(text).toContain('70°')
    expect(text).toContain('68°')
    expect(text).toContain('55°')
    expect(text).toContain('top 70,1 °C, middle 68,4 °C, bottom 55,2 °C')
    expect(meter.querySelector('.heater-glow')).toBeNull()
  })

  it('shows the power and makes the tank glow while heating', async () => {
    show(state({ isHeating: true, powerKw: 2.04 }))

    const meter = await screen.findByRole('meter', { name: 'Hot water' })
    expect(cardText()).toContain('Heating · 2,0 kW')
    expect(meter.querySelector('.heater-glow')).not.toBeNull()
  })

  it('names a special mode and when it ends', async () => {
    const end = new Date(Date.now() + 60_000).toISOString()
    show(state({ specialMode: { mode: 'Supercharge', start: STATE.readingTime, end } }))

    expect(await screen.findByText('Supercharge')).toBeInTheDocument()
    expect(cardText()).toMatch(new RegExp(`until (today|tomorrow) ${formatClock(end)}`))
  })

  it('shows holiday mode, but not the blue battery profile', async () => {
    const { unmount } = show(
      state({ specialMode: { mode: 'Holiday', end: '2026-12-30T10:00:00Z' } }),
    )
    expect(await screen.findByText('Holiday')).toBeInTheDocument()
    unmount()

    show(state({ specialMode: { mode: 'BlueBattery' } }))
    await screen.findByText(/70,1/)
    expect(cardText()).not.toMatch(/BlueBattery|Blue battery|until/)
  })

  it('marks an old reading and an offline heater', async () => {
    show(state({ isStale: true, ageSeconds: 1200, isOnline: false }))

    await screen.findByText(/70,1/)
    const text = cardText()
    expect(text).toContain('Reading is old')
    expect(text).toContain('updated 20 minutes ago')
    expect(text).toContain('Heater is offline')
  })

  it('shows nothing for a location without a heater', async () => {
    let asked = false
    server.use(
      http.get(PATH, () => {
        asked = true
        return HttpResponse.json(
          { errors: { generalErrors: ['No water heater connected'] } },
          { status: 404 },
        )
      }),
    )
    const { container } = renderWithQuery(<WaterHeaterCard locationId="loc-1" />)

    await waitFor(() => expect(asked).toBe(true))
    await waitFor(() => expect(container).toBeEmptyDOMElement())
  })

  it('shows the API message when OSO cannot be read', async () => {
    server.use(
      http.get(PATH, () =>
        HttpResponse.json({ errors: { generalErrors: ['OSO is unavailable'] } }, { status: 503 }),
      ),
    )
    renderWithQuery(<WaterHeaterCard locationId="loc-1" />)

    expect(await screen.findByText('OSO is unavailable')).toBeInTheDocument()
    expect(screen.getByText('Water heater')).toBeInTheDocument()
  })

  it('moves the age on between fetches', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    show(state())
    expect(await screen.findByText(/updated 1 minute ago/)).toBeInTheDocument()

    // 94 s + 30 s: the clock ticks before the next fetch (at 60 s) arrives.
    await act(() => vi.advanceTimersByTimeAsync(30_000))
    expect(cardText()).toContain('updated 2 minutes ago')
  })
})
