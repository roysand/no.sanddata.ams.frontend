import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthContext, type AuthContextValue } from '../features/auth/context'
import { AdminRoute } from './AdminRoute'

function auth(roles: string[]): AuthContextValue {
  return {
    isAuthenticated: true,
    isLoading: false,
    email: 'someone@sanddata.no',
    roles,
    login: async () => {},
    logout: () => {},
  }
}

function renderAdminRoute(roles: string[]) {
  return render(
    <AuthContext.Provider value={auth(roles)}>
      <MemoryRouter initialEntries={['/admin/users']}>
        <Routes>
          <Route path="/" element={<p>Dashboard page</p>} />
          <Route element={<AdminRoute />}>
            <Route path="/admin/users" element={<p>Users page</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('AdminRoute', () => {
  it('lets administrators in', () => {
    renderAdminRoute(['Admin'])
    expect(screen.getByText('Users page')).toBeInTheDocument()
  })

  it('sends other users back to the dashboard', () => {
    renderAdminRoute(['User'])
    expect(screen.getByText('Dashboard page')).toBeInTheDocument()
    expect(screen.queryByText('Users page')).not.toBeInTheDocument()
  })
})
