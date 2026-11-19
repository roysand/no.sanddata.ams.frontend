import { Outlet } from 'react-router-dom'
import { useHasWaterHeater } from '../features/dashboard'
import { useSelectedLocation } from '../features/locations'
import { Header } from './Header'
import { TabBar } from './TabBar'

export function AppLayout() {
  const { hasMultiple, selected } = useSelectedLocation()
  const hasWaterHeater = useHasWaterHeater(selected?.id)

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col bg-background">
      <Header />
      <main className="flex-1 px-4 pt-2 pb-6">
        <Outlet />
      </main>
      <TabBar hasMultipleLocations={hasMultiple} hasWaterHeater={hasWaterHeater} />
    </div>
  )
}
