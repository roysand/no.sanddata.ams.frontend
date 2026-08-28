import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../features/auth/useAuth'

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) return null
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}
