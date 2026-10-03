import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../features/auth/useAuth'

/** Only administrators may see the routes below; everyone else goes back to the dashboard. */
export function AdminRoute() {
  const { roles } = useAuth()
  return roles.includes('Admin') ? <Outlet /> : <Navigate to="/" replace />
}
