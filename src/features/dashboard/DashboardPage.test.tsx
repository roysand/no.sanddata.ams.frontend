import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { server } from '../../test/server'
import { renderWithQuery } from '../../test/render'
import { DashboardPage } from './DashboardPage'

// The charts load their own data; these tests are about which location the page offers.
vi.mock('./CurrentHourCard', () => ({ CurrentHourCard: () => null }))
vi.mock('./PowerChart', () => ({ PowerChart: () => null }))
vi.mock('./HourlyCostChart', () => ({ HourlyCostChart: () => null }))
vi.mock('./DailyCostChart', () => ({ DailyCostChart: () => null }))

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
  it('sends a user without locations to the setup', async () => {
    server.use(http.get('*/api/locations', () => HttpResponse.json([])))
    renderDashboard()

    expect(await screen.findByText('Setup page')).toBeInTheDocument()
  })

  it('offers a shared (viewer) location in the picker and shows its name, as for an owned one', async () => {
    localStorage.clear()
    server.use(
      http.get('*/api/locations', () =>
        HttpResponse.json([location('l1', 'Home', 'Owner'), location('l2', 'Cabin', 'Viewer')]),
      ),
    )
    const user = userEvent.setup()
    renderDashboard()

    expect(await screen.findByRole('heading', { name: 'Home' })).toBeInTheDocument()
    await user.click(screen.getByRole('combobox', { name: 'Location' }))
    await user.click(await screen.findByRole('option', { name: 'Cabin' }))

    expect(await screen.findByRole('heading', { name: 'Cabin' })).toBeInTheDocument()
  })
})
