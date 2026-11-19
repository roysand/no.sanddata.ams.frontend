import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatOsloDate } from '../dashboard'
import type { AdminLocation } from '../locations'
import { ConnectWaterHeaterDialog } from './ConnectWaterHeaterDialog'
import { RemoveWaterHeaterDialog } from './RemoveWaterHeaterDialog'
import { useWaterHeaterActions, useWaterHeaterSettings } from './hooks'

/**
 * Whether a location has an OSO water heater, with Connect, Replace and Remove. Connecting happens in its own dialog;
 * the key is typed there, sent once, and never shown or kept afterwards.
 */
export function WaterHeaterSection({ location }: { location: AdminLocation }) {
  const settings = useWaterHeaterSettings(location.id)
  const actions = useWaterHeaterActions(location.id)
  // Kept from when the dialog opened: after a connect succeeds the heater appears before the dialog closes.
  const [formMode, setFormMode] = useState<'connect' | 'replace' | null>(null)
  const [isConfirmingRemove, setConfirmingRemove] = useState(false)
  const [removeError, setRemoveError] = useState<string | null>(null)

  const closeForm = () => {
    actions.connect.reset()
    setFormMode(null)
  }

  const remove = async () => {
    setRemoveError(null)
    try {
      await actions.remove.mutateAsync()
      setConfirmingRemove(false)
    } catch (error) {
      setRemoveError(error instanceof Error ? error.message : 'Could not remove the water heater')
    }
  }

  const heater = settings.data

  return (
    <section className="space-y-3" aria-label="Water heater">
      <h3 className="text-sm font-medium">Water heater</h3>

      {settings.isLoading ? (
        <Skeleton className="h-5 w-2/3" />
      ) : settings.error ? (
        <p className="text-sm text-destructive">{settings.error.message}</p>
      ) : heater ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="space-y-1">
            <span className="flex items-center gap-2">
              <Badge>Connected</Badge>
              <span className="font-mono">{heater.deviceIdHint}</span>
            </span>
            <span className="block text-xs text-muted-foreground">
              connected {formatOsloDate(heater.connectedAt)}
              {heater.updatedAt !== heater.connectedAt &&
                ` · changed ${formatOsloDate(heater.updatedAt)}`}
            </span>
          </span>
          <span className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setFormMode('replace')}>
              Replace
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRemoveError(null)
                setConfirmingRemove(true)
              }}
            >
              Remove
            </Button>
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">No water heater connected</span>
          <Button variant="outline" size="sm" onClick={() => setFormMode('connect')}>
            Connect
          </Button>
        </div>
      )}

      {formMode && (
        <ConnectWaterHeaterDialog
          locationName={location.name}
          isReplace={formMode === 'replace'}
          connect={actions.connect.mutateAsync}
          isPending={actions.connect.isPending}
          onDone={closeForm}
          onCancel={closeForm}
        />
      )}

      {isConfirmingRemove && (
        <RemoveWaterHeaterDialog
          locationName={location.name}
          isPending={actions.remove.isPending}
          error={removeError}
          onConfirm={remove}
          onCancel={() => setConfirmingRemove(false)}
        />
      )}
    </section>
  )
}
