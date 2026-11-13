import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { server } from '../../test/server'
import { renderWithQuery } from '../../test/render'
import { DashboardPage } from './DashboardPage'

// The cards load their own data; these tests are about which location the page shows.
vi.mock('./NowCard', () => ({
  NowCard: ({ locationId }: { locationId: string }) => <p>now:{locationId}</p>,
}))
vi.mock('./PriceTimeline', () => ({ PriceTimeline: () => null }))
vi.mock('./UsageChart', () => ({ UsageChart: () => null }))

const location = (id: string, name: string, role: 'Owner' | 'Viewer') => ({
  id,
  name,
  address: 'Somewhere 1',
  zone: 'NO1',
  serialNumber: `SN-${id}`,
  hasNorgesPriceAgreement: false,
  isActive: true,
  role,
  meters: [],
})

function renderDashboard() {
  return renderWithQuery(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/setup" element={<p>Setup page</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('DashboardPage', () => {
  beforeEach(() => localStorage.clear())

  it('sends a user without locations to the setup', async () => {
    server.use(http.get('*/api/locations', () => HttpResponse.json([])))
    renderDashboard()

    expect(await screen.findByText('Setup page')).toBeInTheDocument()
  })

  it('shows the first location when none is remembered', async () => {
    server.use(
      http.get('*/api/locations', () =>
        HttpResponse.json([location('l1', 'Home', 'Owner'), location('l2', 'Cabin', 'Viewer')]),
      ),
    )
    renderDashboard()

    expect(await screen.findByText('now:l1')).toBeInTheDocument()
  })

  it('shows the remembered location, also when it is a shared (viewer) one', async () => {
    localStorage.setItem('ams.selectedLocation', 'l2')
    server.use(
      http.get('*/api/locations', () =>
        HttpResponse.json([location('l1', 'Home', 'Owner'), location('l2', 'Cabin', 'Viewer')]),
      ),
    )
    renderDashboard()

    expect(await screen.findByText('now:l2')).toBeInTheDocument()
  })

  it('leaves inactive locations out and falls back to the first active one', async () => {
    localStorage.setItem('ams.selectedLocation', 'l1')
    server.use(
      http.get('*/api/locations', () =>
        HttpResponse.json([
          { ...location('l1', 'Home', 'Owner'), isActive: false },
          location('l2', 'Cabin', 'Owner'),
        ]),
      ),
    )
    renderDashboard()

    expect(await screen.findByText('now:l2')).toBeInTheDocument()
  })

  it('tells a user whose locations are all inactive, and does not send them to the setup', async () => {
    server.use(
      http.get('*/api/locations', () =>
        HttpResponse.json([{ ...location('l1', 'Home', 'Owner'), isActive: false }]),
      ),
    )
    renderDashboard()

    expect(await screen.findByText(/All your locations are inactive/)).toBeInTheDocument()
    expect(screen.queryByText('Setup page')).not.toBeInTheDocument()
  })
})
