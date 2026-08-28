import { Outlet } from 'react-router-dom'
import { Header } from './Header'

export function AppLayout() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="p-8">
        <Outlet />
      </main>
    </div>
  )
}
