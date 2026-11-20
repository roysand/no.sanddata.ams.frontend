import { createBrowserRouter } from 'react-router-dom'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { AdminRoute } from '../components/AdminRoute'
import { AppLayout } from '../components/AppLayout'
import { LoginPage } from '../features/auth/LoginPage'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { HistoryPage } from '../features/dashboard/HistoryPage'
import { EvChargerPage } from '../features/dashboard/EvChargerPage'
import { WaterHeaterPage } from '../features/dashboard/WaterHeaterPage'
import { UsersPage } from '../features/admin/UsersPage'
import { AdminLocationsPage } from '../features/admin/AdminLocationsPage'
import { NorgesPrisPage } from '../features/admin/NorgesPrisPage'
import { LocationPricingPage } from '../features/admin/LocationPricingPage'
import { GridTariffsPage } from '../features/admin/GridTariffsPage'
import { PriceRatesPage } from '../features/admin/PriceRatesPage'
import { LocationsPage, SetupPage } from '../features/locations'
import { LocationsEntry } from '../features/overview/LocationsEntry'

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
          { path: '/history', element: <HistoryPage /> },
          { path: '/water-heater', element: <WaterHeaterPage /> },
          { path: '/ev-charger', element: <EvChargerPage /> },
          { path: '/locations', element: <LocationsEntry /> },
          { path: '/locations/manage', element: <LocationsPage /> },
          {
            element: <AdminRoute />,
            children: [
              { path: '/admin/users', element: <UsersPage /> },
              { path: '/admin/locations', element: <AdminLocationsPage /> },
              { path: '/admin/norgespris', element: <NorgesPrisPage /> },
              { path: '/admin/location-pricing', element: <LocationPricingPage /> },
              { path: '/admin/grid-tariffs', element: <GridTariffsPage /> },
              { path: '/admin/price-rates', element: <PriceRatesPage /> },
            ],
          },
        ],
      },
    ],
  },
])
