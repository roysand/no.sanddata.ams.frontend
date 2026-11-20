import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from '../app/ThemeProvider'
import { AuthContext, type AuthContextValue } from '../features/auth/context'
import { renderWithQuery } from '../test/render'
import { server } from '../test/server'
import { AppLayout } from './AppLayout'

const auth: AuthContextValue = {
  isAuthenticated: true,
  isLoading: false,
  email: 'someone@sanddata.no',
  roles: ['User'],
  login: async () => {},
  logout: () => {},
}

const home = (hasWaterHeater?: boolean) => ({
  id: 'l1',
  name: 'Hjemme',
  address: 'Gata 1',
  zone: 'NO1',
  serialNumber: 'SN-l1',
  hasNorgesPriceAgreement: false,
  isActive: true,
  role: 'Owner',
  meters: [],
  ...(hasWaterHeater === undefined ? {} : { hasWaterHeater }),
})

/** Serves the location list and counts any request for the heater's state, which reads OSO. */
function renderLayout(location: ReturnType<typeof home>) {
  const heaterReads = { count: 0 }
  server.use(
    http.get('*/api/locations', () => HttpResponse.json([location])),
    http.get('*/api/locations/:id/water-heater', () => {
      heaterReads.count++
      return HttpResponse.json({}, { status: 500 })
    }),
  )
  localStorage.clear()
  renderWithQuery(
    <ThemeProvider>
      <AuthContext.Provider value={auth}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<p>Now page</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </ThemeProvider>,
  )
  return heaterReads
}

describe('AppLayout', () => {
  it('shows the Heater tab from the location list, without reading the heater', async () => {
    const heaterReads = renderLayout(home(true))

    expect(await screen.findByRole('link', { name: /Heater/ })).toBeInTheDocument()
    expect(heaterReads.count).toBe(0)
  })

  it('has no Heater tab for a location without one', async () => {
    renderLayout(home(false))

    expect(await screen.findByRole('link', { name: /History/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Heater/ })).not.toBeInTheDocument()
  })

  it('has no Heater tab when an older API leaves the flag out', async () => {
    renderLayout(home())

    expect(await screen.findByRole('link', { name: /History/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Heater/ })).not.toBeInTheDocument()
  })
})
