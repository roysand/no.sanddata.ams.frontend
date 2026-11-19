import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { MemoryRouter } from 'react-router-dom'
import { server } from '../../test/server'
import { renderWithQuery } from '../../test/render'
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
    )
    renderPage()

    expect(await screen.findByText('333 of 360 l')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Water heater' })).toBeInTheDocument()
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
  })
})
