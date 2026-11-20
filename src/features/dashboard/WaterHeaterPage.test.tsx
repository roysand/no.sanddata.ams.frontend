import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { MemoryRouter } from 'react-router-dom'
import { november2026Estimate, withWaterHeater } from '../../test/bills'
import { server } from '../../test/server'
import { renderWithQuery } from '../../test/render'
import { osloMonth } from './format'
import { WaterHeaterPage } from './WaterHeaterPage'
import type { WaterHeaterState } from './types'

const home = {
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

const STATE: WaterHeaterState = {
  locationId: 'l1',
  readingTime: '2026-11-19T18:06:48.703Z',
  ageSeconds: 94,
  isStale: false,
  isOnline: true,
  isHeating: false,
  setPointCelsius: 72,
  temperatures: { topCelsius: 70.1, midCelsius: null, lowCelsius: null, fourthCelsius: null },
  hotWater: {
    availableLitres40: 333,
    maxLitres40: 360,
    showers: 3,
    baths: 1,
    storedEnergyKwh: null,
  },
  powerKw: 0.0117,
  specialMode: { mode: 'None', start: null, end: null, profileName: null },
  osoCodes: {},
}

/** Today: 3 kWh, half of it water heating; the month's bill with its water heating part. */
function energyHandlers() {
  return [
    http.get('*/api/electricity-cost/hourly', () =>
      HttpResponse.json({
        items: [
          {
            hourStart: new Date().toISOString(),
            consumptionKwh: 3,
            pricingModel: 'Spot',
            actual: { ratePerKwh: 1, cost: 3 },
            comparison: null,
            waterHeater: { kwh: 1.5, cost: 1.2, sampledMinutes: 60, capped: false },
          },
        ],
        page: 1,
        pageSize: 500,
        totalCount: 1,
      }),
    ),
    http.get('*/api/electricity-cost/bill', () =>
      HttpResponse.json(
        withWaterHeater({ ...november2026Estimate(), month: osloMonth(new Date()) }),
      ),
    ),
  ]
}

function renderPage() {
  return renderWithQuery(
    <MemoryRouter initialEntries={['/water-heater']}>
      <WaterHeaterPage />
    </MemoryRouter>,
  )
}

describe('WaterHeaterPage', () => {
  beforeEach(() => localStorage.clear())

  it('shows the heater of the selected location', async () => {
    server.use(
      http.get('*/api/locations', () => HttpResponse.json([home])),
      http.get('*/api/locations/l1/water-heater', () => HttpResponse.json(STATE)),
      ...energyHandlers(),
    )
    renderPage()

    expect(await screen.findByText('333 of 360 l')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Water heater' })).toBeInTheDocument()
  })

  it("shows today's and this month's water heating below the live state", async () => {
    server.use(
      http.get('*/api/locations', () => HttpResponse.json([home])),
      http.get('*/api/locations/l1/water-heater', () => HttpResponse.json(STATE)),
      ...energyHandlers(),
    )
    renderPage()

    expect(await screen.findByText('Energy')).toBeInTheDocument()
    expect(await screen.findByText(/^1,5 kWh · 1,20 kr · 50 % of today's use$/)).toBeInTheDocument()
    // The bill (104,6 kWh) ends before today's running hour, so the month adds it: 104,6 + 1,5.
    expect(await screen.findByText(/^106,1 kWh · 95,32 kr/)).toBeInTheDocument()
  })

  it('says so when the selected location has no heater', async () => {
    server.use(
      http.get('*/api/locations', () => HttpResponse.json([home])),
      http.get('*/api/locations/l1/water-heater', () =>
        HttpResponse.json({ errors: { generalErrors: ['Not connected'] } }, { status: 404 }),
      ),
    )
    renderPage()

    expect(await screen.findByText(/No water heater is connected at Hjemme/)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Water heater' })).not.toBeInTheDocument()
    // No energy card, so no hourly or bill request (MSW would fail the test on an unhandled one).
    expect(screen.queryByText('Energy')).not.toBeInTheDocument()
  })
})
