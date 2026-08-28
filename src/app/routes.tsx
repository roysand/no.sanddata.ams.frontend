import { createBrowserRouter } from 'react-router-dom'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { LoginPage } from '../features/auth/LoginPage'
import { MeasurementsPage } from '../features/measurements/MeasurementsPage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [{ path: '/', element: <MeasurementsPage /> }],
  },
])
