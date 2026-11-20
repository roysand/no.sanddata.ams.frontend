import { NavLink } from 'react-router-dom'
import { CarIcon, ChartColumnIcon, HouseIcon, ShowerHeadIcon, ZapIcon } from 'lucide-react'

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-xs font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${
    isActive ? 'bg-accent text-foreground' : 'text-muted-foreground'
  }`

/** Written out in full so Tailwind sees each class. */
const COLUMNS: Record<number, string> = { 3: 'grid-cols-3', 4: 'grid-cols-4', 5: 'grid-cols-5' }

/**
 * Bottom navigation. The last tab becomes "All locations" when the user has more than one; a Heater tab is added when
 * the selected location has a water heater, and a Car tab when it has a car charger. One column per tab shown.
 */
export function TabBar({
  hasMultipleLocations,
  hasWaterHeater = false,
  hasEvCharger = false,
}: {
  hasMultipleLocations: boolean
  hasWaterHeater?: boolean
  hasEvCharger?: boolean
}) {
  const columns = COLUMNS[3 + Number(hasWaterHeater) + Number(hasEvCharger)]
  return (
    <nav
      aria-label="Main"
      className={`sticky bottom-0 z-40 grid ${columns} gap-1 border-t bg-card px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]`}
    >
      <NavLink to="/" end className={tabClass}>
        <ZapIcon className="size-5" aria-hidden="true" />
        Now
      </NavLink>
      <NavLink to="/history" className={tabClass}>
        <ChartColumnIcon className="size-5" aria-hidden="true" />
        History
      </NavLink>
      {hasWaterHeater && (
        <NavLink to="/water-heater" className={tabClass}>
          <ShowerHeadIcon className="size-5" aria-hidden="true" />
          Heater
        </NavLink>
      )}
      {hasEvCharger && (
        <NavLink to="/ev-charger" className={tabClass}>
          <CarIcon className="size-5" aria-hidden="true" />
          Car
        </NavLink>
      )}
      <NavLink to="/locations" className={tabClass}>
        <HouseIcon className="size-5" aria-hidden="true" />
        {hasMultipleLocations ? 'All locations' : 'Location'}
      </NavLink>
    </nav>
  )
}
