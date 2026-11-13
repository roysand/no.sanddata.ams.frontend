import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '../app/ThemeProvider'
import { AuthContext, type AuthContextValue } from '../features/auth/context'
import { renderWithQuery } from '../test/render'
import { server } from '../test/server'
import { Header } from './Header'

const location = (id: string, name: string, isActive = true) => ({
  id,
  name,
  address: 'Somewhere 1',
  zone: 'NO1',
  serialNumber: `SN-${id}`,
  hasNorgesPriceAgreement: false,
  isActive,
  role: 'Owner',
  meters: [],
})

function auth(roles: string[], logout = () => {}): AuthContextValue {
  return {
    isAuthenticated: true,
    isLoading: false,
    email: 'ola.nordmann@example.com',
    roles,
    login: async () => {},
    logout,
  }
}

function renderHeader(
  roles: string[],
  locations = [location('l1', 'Home')],
  options: { logout?: () => void; path?: string } = {},
) {
  server.use(http.get('*/api/locations', () => HttpResponse.json(locations)))
  localStorage.clear()
  return renderWithQuery(
    <ThemeProvider>
      <AuthContext.Provider value={auth(roles, options.logout)}>
        <MemoryRouter initialEntries={[options.path ?? '/']}>
          <Header />
        </MemoryRouter>
      </AuthContext.Provider>
    </ThemeProvider>,
  )
}

describe('Header', () => {
  it('shows who is signed in: initials, email and role', () => {
    renderHeader(['User'])

    expect(screen.getByText('ON')).toBeInTheDocument()
    expect(screen.getByText('ola.nordmann@example.com')).toBeInTheDocument()
    expect(screen.getByText('User')).toBeInTheDocument()
  })

  it('shows no menu button to a regular user', () => {
    renderHeader(['User'])

    expect(screen.queryByRole('button', { name: 'Open menu' })).not.toBeInTheDocument()
  })

  it('offers the menu with the administration pages to an administrator', async () => {
    const user = userEvent.setup()
    renderHeader(['Admin'])

    await user.click(screen.getByRole('button', { name: 'Open menu' }))

    const menu = screen.getByRole('dialog', { name: 'Menu' })
    expect(within(menu).getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
    expect(within(menu).getByRole('link', { name: 'My locations' })).toBeInTheDocument()
    expect(within(menu).getByRole('link', { name: 'Users' })).toBeInTheDocument()
    expect(within(menu).getByRole('link', { name: 'Locations' })).toBeInTheDocument()
  })

  it('opens the account panel from the user chip and signs out', async () => {
    const logout = vi.fn()
    const user = userEvent.setup()
    renderHeader(['User'], undefined, { logout })

    await user.click(screen.getByRole('button', { name: /Account/ }))
    await user.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(logout).toHaveBeenCalledOnce()
  })

  it('closes a panel with Escape and returns focus to its button', async () => {
    const user = userEvent.setup()
    renderHeader(['Admin'])
    const opener = screen.getByRole('button', { name: 'Open menu' })

    await user.click(opener)
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
  })

  it('cycles the theme button and says what is shown', async () => {
    const user = userEvent.setup()
    renderHeader(['User'])

    await user.click(screen.getByRole('button', { name: /Theme: follow device/ }))

    expect(screen.getByRole('button', { name: /Theme: light/ })).toBeInTheDocument()
  })

  it('links the location name to the overview only when the user has several active locations', async () => {
    renderHeader(['User'], [location('l1', 'Home'), location('l2', 'Cabin')])

    expect(await screen.findByRole('link', { name: /Home.*Switch location/ })).toHaveAttribute(
      'href',
      '/locations',
    )
  })

  it('shows a single location as plain text, without a switcher', async () => {
    renderHeader(['User'], [location('l1', 'Home'), location('l2', 'Cabin', false)])

    expect(await screen.findByText('Home')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Switch location/ })).not.toBeInTheDocument()
  })
})
