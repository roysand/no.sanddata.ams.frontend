import { createBrowserRouter } from 'react-router-dom'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { AdminRoute } from '../components/AdminRoute'
import { AppLayout } from '../components/AppLayout'
import { LoginPage } from '../features/auth/LoginPage'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { UsersPage } from '../features/admin/UsersPage'
import { LocationsPage, SetupPage } from '../features/locations'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <DashboardPage /> },
          { path: '/setup', element: <SetupPage /> },
          { path: '/locations', element: <LocationsPage /> },
          {
            element: <AdminRoute />,
            children: [{ path: '/admin/users', element: <UsersPage /> }],
          },
        ],
      },
    ],
  },
])
