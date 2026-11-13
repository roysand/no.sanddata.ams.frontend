import { NavLink } from 'react-router-dom'
import { SidePanel } from './SidePanel'

const itemClass = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-12 items-center rounded-xl px-3 text-base font-medium outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 ${
    isActive ? 'bg-accent text-foreground' : ''
  }`

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/locations/manage', label: 'My locations', end: false },
]

const adminItems = [
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/locations', label: 'Locations' },
]

/** Extra pages, offered only to users who have some (administrators today). The server still enforces access. */
export function MenuPanel({
  open,
  onOpenChange,
  isAdmin,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  isAdmin: boolean
}) {
  const close = () => onOpenChange(false)
  return (
    <SidePanel open={open} onOpenChange={onOpenChange} title="Menu">
      <nav aria-label="Menu" className="flex flex-col gap-0.5">
        <h2 className="mt-3 mb-1 px-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Navigate
        </h2>
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={itemClass} onClick={close}>
            {item.label}
          </NavLink>
        ))}
        {isAdmin && (
          <>
            <h2 className="mt-4 mb-1 px-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Administration
            </h2>
            {adminItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={itemClass} onClick={close}>
                {item.label}
              </NavLink>
            ))}
          </>
        )}
      </nav>
    </SidePanel>
  )
}
