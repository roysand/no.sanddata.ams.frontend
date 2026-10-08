import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthContext, type AuthContextValue } from '../features/auth/context'
import { ProtectedRoute } from './ProtectedRoute'

function renderAt(auth: Partial<AuthContextValue>) {
  const value: AuthContextValue = {
    isAuthenticated: false,
    isLoading: false,
    email: null,
    roles: [],
    login: async () => {},
    logout: () => {},
    ...auth,
  }
  return render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/login" element={<p>Login page</p>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<p>Secret</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('ProtectedRoute', () => {
  it('renders the page when authenticated', () => {
    renderAt({ isAuthenticated: true })
    expect(screen.getByText('Secret')).toBeInTheDocument()
  })

  it('redirects to login when not authenticated', () => {
    renderAt({ isAuthenticated: false })
    expect(screen.getByText('Login page')).toBeInTheDocument()
  })

  it('renders nothing while the session is loading', () => {
    renderAt({ isLoading: true })
    expect(screen.queryByText('Secret')).not.toBeInTheDocument()
    expect(screen.queryByText('Login page')).not.toBeInTheDocument()
  })
})
