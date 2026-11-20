import { Badge } from '@/components/ui/badge'
import { expiryBadge } from './keyReminders'

/** "expires in 12 days", "expires today" or "expired" next to a key's date; nothing when it is far ahead. */
export function ExpiryBadge({ daysLeft }: { daysLeft: number }) {
  const badge = expiryBadge(daysLeft)
  if (!badge) return null
  return (
    <Badge
      variant={badge.urgent ? 'destructive' : 'outline'}
      className={badge.urgent ? undefined : 'border-destructive/40 text-destructive'}
    >
      {badge.text}
    </Badge>
  )
}
