import { useId, useState } from 'react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ApiError } from '../../lib/apiClient'
import { useHighDemand } from './hooks'
import type { WaterHeaterState } from './types'

/** What a failed switch means for the Admin (spec 020, research R4). */
function failureText(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 503) {
      return "Couldn't reach the heater. It may or may not have switched; the state below is read again."
    }
    if (error.code === 'WaterHeater.HighDemandNotOffered')
      return 'OSO no longer offers High Demand.'
    if (error.code === 'WaterHeater.Rejected' || error.code === 'WaterHeater.KeyUnreadable') {
      return "The heater's OSO key must be reconnected under Admin → Locations."
    }
  }
  return error instanceof Error ? error.message : 'The switch failed.'
}

const isNotOffered = (error: unknown) =>
  error instanceof ApiError && error.code === 'WaterHeater.HighDemandNotOffered'

/**
 * The water heater's High Demand switch, for Admins (spec 020): on while the heater reports High Demand ("Supercharge"
 * in OSO's status). While a switch is in flight it shows the value being sent and can't be pressed again; a failure is
 * never retried, so a second "on" can't restart the 24 hours.
 */
export function HighDemandSwitch({
  locationId,
  state,
}: {
  locationId: string
  state: WaterHeaterState
}) {
  const id = useId()
  const switchHighDemand = useHighDemand(locationId)
  // Once OSO has said it no longer offers High Demand, the switch stays off until the page is opened again.
  const [notOffered, setNotOffered] = useState(false)
  const isOn = state.specialMode.mode === 'Supercharge'
  const pending = switchHighDemand.isPending
  const checked = pending ? switchHighDemand.variables : isOn

  const change = (on: boolean) =>
    switchHighDemand.mutate(on, {
      onError: (error) => {
        if (isNotOffered(error)) setNotOffered(true)
      },
    })

  return (
    <div className="space-y-1 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id} className="text-sm font-semibold">
          High Demand
        </Label>
        <div className="flex items-center gap-2">
          <span role="status" className="text-xs text-muted-foreground">
            {pending ? 'Switching…' : null}
          </span>
          <Switch
            id={id}
            checked={checked}
            disabled={pending || notOffered || !state.isOnline}
            onCheckedChange={change}
            aria-describedby={`${id}-note`}
          />
        </div>
      </div>
      <p id={`${id}-note`} className="text-xs text-muted-foreground">
        Heats the tank extra for 24 hours.
      </p>
      {switchHighDemand.error && (
        <p className="text-sm text-destructive">{failureText(switchHighDemand.error)}</p>
      )}
    </div>
  )
}
