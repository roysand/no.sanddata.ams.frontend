import { Outlet } from 'react-router-dom'
import { KeyReminderBanner } from '../features/admin/KeyReminderBanner'
import { WarningBanner } from '../features/dashboard'
import { useSelectedLocation } from '../features/locations'
import { Header } from './Header'
import { TabBar } from './TabBar'

export function AppLayout() {
  const { hasMultiple, selected } = useSelectedLocation()
  // From the location list, which is loaded first anyway, so the Heater tab appears with the others.
  const hasWaterHeater = selected?.hasWaterHeater === true

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col bg-background">
      <Header />
      {/*
        The selected location's warnings, for everyone who may see it (spec 012), then the key reminders, for
        administrators only while a key expires within 30 days (spec 011).
      */}
      <div className="px-4">
        {selected && <WarningBanner location={selected} />}
        <KeyReminderBanner />
      </div>
      <main className="flex-1 px-4 pt-2 pb-6">
        <Outlet />
      </main>
      <TabBar hasMultipleLocations={hasMultiple} hasWaterHeater={hasWaterHeater} />
    </div>
  )
}
