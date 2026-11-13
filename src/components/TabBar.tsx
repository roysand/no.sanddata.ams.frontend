import { NavLink } from 'react-router-dom'
import { ChartColumnIcon, HouseIcon, ZapIcon } from 'lucide-react'

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-xs font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${
    isActive ? 'bg-accent text-foreground' : 'text-muted-foreground'
  }`

/** Bottom navigation. The last tab becomes "All locations" when the user has more than one. */
export function TabBar({ hasMultipleLocations }: { hasMultipleLocations: boolean }) {
  return (
    <nav
      aria-label="Main"
      className="sticky bottom-0 z-40 grid grid-cols-3 gap-1 border-t bg-card px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      <NavLink to="/" end className={tabClass}>
        <ZapIcon className="size-5" aria-hidden="true" />
        Now
      </NavLink>
      <NavLink to="/history" className={tabClass}>
        <ChartColumnIcon className="size-5" aria-hidden="true" />
        History
      </NavLink>
      <NavLink to="/locations" className={tabClass}>
        <HouseIcon className="size-5" aria-hidden="true" />
        {hasMultipleLocations ? 'All locations' : 'Location'}
      </NavLink>
    </nav>
  )
}
