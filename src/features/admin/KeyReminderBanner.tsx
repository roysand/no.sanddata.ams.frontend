import { AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { useKeyReminders } from './hooks'
import { expiredConsequence, reminderText } from './keyReminders'
import type { KeyReminder } from './types'

/** More than this many lines would push the page far down on a phone; the rest is "and N more". */
const MAX_LINES = 3

const linkTo = (r: KeyReminder) =>
  `/admin/locations?edit=${encodeURIComponent(r.locationId)}&key=${r.kind === 'SensorKey' ? 'sensor' : 'heater'}`

/**
 * Reminds administrators of the keys that expire within 30 days or have expired (spec 011). Each line leads to the
 * location's dialog, where the key is replaced. Others never ask for the list; without data, nothing is shown.
 */
export function KeyReminderBanner() {
  const { roles } = useAuth()
  const isAdmin = roles.includes('Admin')
  const { data } = useKeyReminders(isAdmin)

  if (!isAdmin || !data || data.items.length === 0) return null
  const shown = data.items.slice(0, MAX_LINES)
  const more = data.items.length - shown.length

  return (
    <section
      role="region"
      aria-label="Keys that expire soon"
      className="mt-2 rounded-xl border border-border bg-card p-3 text-sm"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-destructive" />
        <ul className="min-w-0 flex-1 space-y-1.5">
          {shown.map((r) => (
            <li key={`${r.locationId}-${r.kind}`}>
              <Link
                to={linkTo(r)}
                data-urgent={r.expired ? 'true' : undefined}
                className={
                  r.expired
                    ? 'block rounded-md bg-destructive/10 px-2 py-1 text-destructive underline-offset-2 hover:underline'
                    : 'block px-2 py-1 text-muted-foreground underline-offset-2 hover:underline'
                }
              >
                <span className={r.expired ? 'font-semibold' : undefined}>{reminderText(r)}</span>
                {r.expired && <span>. {expiredConsequence(r.kind)}.</span>}
              </Link>
            </li>
          ))}
          {more > 0 && (
            <li>
              <Link
                to="/admin/locations"
                className="block px-2 py-1 text-muted-foreground underline underline-offset-2"
              >
                and {more} more
              </Link>
            </li>
          )}
        </ul>
      </div>
    </section>
  )
}
