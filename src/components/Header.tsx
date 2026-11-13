import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronDownIcon, MenuIcon, MonitorIcon, MoonIcon, SunIcon } from 'lucide-react'
import { useAuth } from '../features/auth/useAuth'
import { useSelectedLocation } from '../features/locations'
import { useTheme } from '../app/themeContext'
import { Button } from '@/components/ui/button'
import { AccountPanel } from './AccountPanel'
import { MenuPanel } from './MenuPanel'
import { initialsOf } from './initials'

const THEME = {
  system: { Icon: MonitorIcon, label: 'follow device' },
  light: { Icon: SunIcon, label: 'light' },
  dark: { Icon: MoonIcon, label: 'dark' },
} as const

export function Header() {
  const { email, roles, logout } = useAuth()
  const { selected, hasMultiple } = useSelectedLocation()
  const { preference, cycle } = useTheme()
  const { pathname } = useLocation()
  const [panel, setPanel] = useState<'account' | 'menu' | null>(null)

  // Only users with extra pages (administrators today) get the menu. The server still enforces access.
  const isAdmin = roles.includes('Admin')
  const onDashboard = pathname === '/' || pathname === '/history'
  const { Icon, label } = THEME[preference]

  return (
    <header className="px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-1">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setPanel('account')}
          aria-label={`Account: ${email ?? ''}`}
          className="flex min-h-12 min-w-0 items-center gap-2.5 rounded-full border bg-card py-1 pr-4 pl-1 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span
            aria-hidden="true"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
          >
            {initialsOf(email ?? '?')}
          </span>
          <span className="grid min-w-0 leading-tight">
            <span className="truncate text-sm font-semibold">{email}</span>
            <span className="text-xs text-muted-foreground">
              {isAdmin ? 'Administrator' : 'User'}
            </span>
          </span>
        </button>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="outline"
            className="size-11 rounded-xl"
            onClick={cycle}
            aria-label={`Theme: ${label}. Tap to change`}
          >
            <Icon className="size-5" aria-hidden="true" />
          </Button>
          {isAdmin && (
            <Button
              variant="outline"
              className="size-11 rounded-xl"
              onClick={() => setPanel('menu')}
              aria-label="Open menu"
            >
              <MenuIcon className="size-5" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>

      {onDashboard && selected && (
        <div className="min-h-12 pt-3">
          {hasMultiple ? (
            <Link
              to="/locations"
              aria-label={`${selected.name}. Switch location or see all locations`}
              className="flex min-w-0 items-center gap-1.5 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="truncate text-xl font-extrabold tracking-tight">
                {selected.name}
              </span>
              <ChevronDownIcon className="size-5 shrink-0 text-usage" aria-hidden="true" />
            </Link>
          ) : (
            <p className="truncate text-xl font-extrabold tracking-tight">{selected.name}</p>
          )}
          <p className="text-sm text-muted-foreground">
            {selected.address} · price zone {selected.zone}
          </p>
        </div>
      )}

      <AccountPanel
        open={panel === 'account'}
        onOpenChange={(open) => !open && setPanel(null)}
        email={email ?? ''}
        roleLabel={isAdmin ? 'Administrator' : 'User'}
        onSignOut={logout}
      />
      {isAdmin && (
        <MenuPanel
          open={panel === 'menu'}
          onOpenChange={(open) => !open && setPanel(null)}
          isAdmin={isAdmin}
        />
      )}
    </header>
  )
}
