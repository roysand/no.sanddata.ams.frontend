import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { formatOsloDate, osloToday } from '../dashboard'
import type { AdminLocation } from '../locations'
import { ExpiryBadge } from './ExpiryBadge'
import { daysUntilDate, sensorKeyLastDay } from './keyReminders'
import { ReplaceSensorKeyDialog } from './ReplaceSensorKeyDialog'

/**
 * The location's sensor key as facts (hint, status, expiry) and a way to replace it. The key itself is never shown
 * here; a new one is shown once by the replace dialog.
 */
export function SensorKeySection({ location }: { location: AdminLocation }) {
  const [isReplacing, setReplacing] = useState(false)
  const key = location.apiKey

  return (
    <section id="sensor-key" className="space-y-2" aria-label="Sensor key">
      <h3 className="text-sm font-medium" tabIndex={-1}>
        Sensor key
      </h3>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        {key ? (
          <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            …{key.hint} · {key.status} · expires {formatOsloDate(key.expiresAt)}
            {/* A deactivated key is off on purpose, not expiring. */}
            {key.isActive && (
              <ExpiryBadge daysLeft={daysUntilDate(sensorKeyLastDay(key.expiresAt), osloToday())} />
            )}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">No sensor key</span>
        )}
        <Button variant="outline" size="sm" onClick={() => setReplacing(true)}>
          Replace sensor key
        </Button>
      </div>
      {isReplacing && (
        <ReplaceSensorKeyDialog
          locationId={location.id}
          locationName={location.name}
          onClose={() => setReplacing(false)}
        />
      )}
    </section>
  )
}
