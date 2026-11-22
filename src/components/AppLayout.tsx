import { Outlet } from 'react-router-dom'
import { KeyReminderBanner } from '../features/admin/KeyReminderBanner'
import { WarningBanner } from '../features/dashboard'
import { useSelectedLocation } from '../features/locations'
import { Header } from './Header'
import { TabBar } from './TabBar'

export function AppLayout() {
  const { active, hasMultiple, select, selected } = useSelectedLocation()
  // From the location list, which is loaded first anyway, so the Heater and Car tabs appear with the others.
  const hasWaterHeater = selected?.hasWaterHeater === true
  const hasEvCharger = selected?.hasEvCharger === true

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col bg-background">
      <Header />
      {/*
        The warnings, for everyone who may see the location: capacity and usage for the selected one (spec 012),
        Norgespris for every active one (spec 015). Then the key reminders, for administrators only while a key
        expires within 30 days (spec 011).
      */}
      <div className="px-4">
        {selected && <WarningBanner location={selected} locations={active} onSelect={select} />}
        <KeyReminderBanner />
      </div>
      <main className="flex-1 px-4 pt-2 pb-6">
        <Outlet />
      </main>
      <TabBar
        hasMultipleLocations={hasMultiple}
        hasWaterHeater={hasWaterHeater}
        hasEvCharger={hasEvCharger}
      />
    </div>
  )
}
