import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from '../app/ThemeProvider'
import { AuthContext, type AuthContextValue } from '../features/auth/context'
import { renderWithQuery } from '../test/render'
import { server } from '../test/server'
import { ALL_DUE, WARNING_NOW, warningHandlers, type WarningFigures } from '../test/warnings'
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

/**
 * Serves the location list and the figures the warnings banner reads (quiet unless `figures` says otherwise), and
 * counts any request for the heater's state, which reads OSO. `selectedId` is the location chosen in the header.
 */
function renderLayout(
  location: ReturnType<typeof home> | ReturnType<typeof home>[],
  roles = ['User'],
  { figures = {}, selectedId }: { figures?: WarningFigures; selectedId?: string } = {},
) {
  const heaterReads = { count: 0 }
  server.use(
    ...warningHandlers(figures),
    http.get('*/api/locations', () =>
      HttpResponse.json(Array.isArray(location) ? location : [location]),
    ),
    http.get('*/api/locations/:id/water-heater', () => {
      heaterReads.count++
      return HttpResponse.json({}, { status: 500 })
    }),
  )
  localStorage.clear()
  if (selectedId) localStorage.setItem('ams.selectedLocation', selectedId)
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

  it('shows the Car tab from the location list when the location has a car charger', async () => {
    renderLayout({ ...home(true), hasEvCharger: true } as ReturnType<typeof home>)

    expect(await screen.findByRole('link', { name: /Car/ })).toHaveAttribute('href', '/ev-charger')
  })

  it('has no Car tab without a car charger, or when an older API leaves the flag out', async () => {
    renderLayout(home(true))

    expect(await screen.findByRole('link', { name: /Heater/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Car/ })).not.toBeInTheDocument()
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

  describe('warnings', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(WARNING_NOW)
    })
    afterEach(() => vi.useRealTimers())

    const keyReminder = () =>
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

    it('shows the warnings for everyone with access, before the key reminders', async () => {
      keyReminder()
      renderLayout(home(false), ['Admin'], { figures: ALL_DUE })

      const warnings = await screen.findByRole('region', { name: 'Warnings for Hjemme' })
      const keys = await screen.findByRole('region', { name: 'Keys that expire soon' })
      expect(warnings.compareDocumentPosition(keys) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })

    it('shows them to a viewer too', async () => {
      renderLayout({ ...home(false), role: 'Viewer' }, ['User'], { figures: ALL_DUE })

      expect(await screen.findByRole('region', { name: 'Warnings for Hjemme' })).toBeInTheDocument()
    })

    it("shows the selected location's warnings", async () => {
      const hytta = { ...home(false), id: 'l2', name: 'Hytta', serialNumber: 'SN-l2' }
      renderLayout([home(false), hytta], ['User'], { figures: ALL_DUE, selectedId: 'l2' })

      const warnings = await screen.findByRole('region', { name: 'Warnings for Hytta' })
      expect(await screen.findByText(/Hytta uses 3,8 kW now/)).toBeInTheDocument()
      expect(warnings).not.toHaveTextContent('Hjemme')
    })

    it('shows no warnings without a location', async () => {
      server.use(
        ...warningHandlers(ALL_DUE),
        http.get('*/api/locations', () => HttpResponse.json([])),
      )
      localStorage.clear()
      renderWithQuery(
        <ThemeProvider>
          <AuthContext.Provider value={authAs(['User'])}>
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

      expect(await screen.findByText('Now page')).toBeInTheDocument()
      expect(screen.queryByRole('region', { name: /Warnings for/ })).not.toBeInTheDocument()
    })
  })
})
