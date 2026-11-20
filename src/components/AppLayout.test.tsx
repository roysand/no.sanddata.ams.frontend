import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from '../app/ThemeProvider'
import { AuthContext, type AuthContextValue } from '../features/auth/context'
import { renderWithQuery } from '../test/render'
import { server } from '../test/server'
import { AppLayout } from './AppLayout'

const authAs = (roles: string[]): AuthContextValue => ({
  isAuthenticated: true,
  isLoading: false,
  email: 'someone@sanddata.no',
  roles,
  login: async () => {},
  logout: () => {},
})

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
function renderLayout(location: ReturnType<typeof home>, roles = ['User']) {
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
      <AuthContext.Provider value={authAs(roles)}>
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

  it('shows the key reminder banner above the page for an administrator', async () => {
    server.use(
      http.get('*/api/admin/key-reminders', () =>
        HttpResponse.json({
          today: '2026-11-20',
          windowDays: 30,
          items: [
            {
              locationId: 'l1',
              locationName: 'Hjemme',
              kind: 'SensorKey',
              expiresOn: '2026-12-02',
              expiresAt: '2026-12-02T09:14:03Z',
              daysLeft: 12,
              expired: false,
            },
          ],
        }),
      ),
    )
    renderLayout(home(false), ['Admin'])

    const banner = await screen.findByRole('region', { name: 'Keys that expire soon' })
    expect(banner).toHaveTextContent('The sensor key for Hjemme expires in 12 days')
    // Above the page: the banner comes before the page content in the document.
    expect(
      banner.compareDocumentPosition(screen.getByText('Now page')) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })
})
