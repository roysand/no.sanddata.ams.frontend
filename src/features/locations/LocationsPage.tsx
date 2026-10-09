import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useCreateMeter, useCreateOwnLocation, useLocations } from './hooks'
import { LocationForm } from './LocationForm'
import { MeterForm } from './MeterForm'
import {
  LOCATION_LIMIT_MESSAGE,
  hasReachedLocationLimit,
  type LocationFormValues,
  type MeterFormValues,
} from './schema'
import { SensorKeyNotice } from './SensorKeyNotice'
import { toFormServerError } from './serverErrors'
import type { LocationSummary } from './types'

const LOCATION_FIELDS = ['name', 'address', 'serialNumber', 'zone'] as const
const METER_FIELDS = ['locationId', 'deviceId', 'comment'] as const

/** The user's own locations with their meters, and the actions to add more. */
export function LocationsPage() {
  const { data: locations, isLoading, error } = useLocations()
  const [adding, setAdding] = useState(false)
  const [meterFor, setMeterFor] = useState<LocationSummary | null>(null)

  if (isLoading) return <p className="text-center text-sm text-white">Loading…</p>
  if (error || !locations) {
    return (
      <Card className="mx-auto max-w-4xl bg-white/95 shadow-lg">
        <CardContent className="pt-6 text-sm text-destructive">
          {error?.message ?? 'Could not load your locations'}
        </CardContent>
      </Card>
    )
  }

  const atLimit = hasReachedLocationLimit(locations.length)

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white drop-shadow">My locations</h1>
        <Button onClick={() => setAdding(true)} disabled={atLimit}>
          Add location
        </Button>
      </div>
      {atLimit && (
        <p className="text-sm text-white drop-shadow" role="status">
          {LOCATION_LIMIT_MESSAGE}
        </p>
      )}

      {locations.length === 0 && (
        <Card className="bg-white/95 shadow-lg">
          <CardContent className="pt-6 text-sm text-muted-foreground">
            You have no locations yet.
          </CardContent>
        </Card>
      )}

      {locations.map((location) => (
        <Card key={location.id} className="bg-white/95 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{location.name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {location.address} · price zone {location.zone}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setMeterFor(location)}>
              Add meter
            </Button>
          </CardHeader>
          <CardContent>
            {location.meters.length === 0 ? (
              <p className="text-sm text-muted-foreground">No meters yet.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {location.meters.map((meter) => (
                  <li key={meter.id}>
                    {meter.deviceId}
                    {meter.comment ? ` · ${meter.comment}` : ''}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ))}

      {adding && <AddOwnLocationDialog onClose={() => setAdding(false)} />}
      {meterFor && <AddOwnMeterDialog location={meterFor} onClose={() => setMeterFor(null)} />}
    </div>
  )
}

function AddOwnLocationDialog({ onClose }: { onClose: () => void }) {
  const createLocation = useCreateOwnLocation()
  // Held only while the dialog is open; closing the dialog drops the key for good.
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof LocationFormValues, string>>>(
    {},
  )

  const submit = async (values: LocationFormValues) => {
    setServerError(null)
    setFieldErrors({})
    try {
      const created = await createLocation.mutateAsync(values)
      setApiKey(created.apiKey)
    } catch (error) {
      const parsed = toFormServerError(error, LOCATION_FIELDS, 'Could not add the location')
      setFieldErrors(parsed.fields)
      setServerError(parsed.message)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add location</DialogTitle>
          <DialogDescription>The location is added to your account.</DialogDescription>
        </DialogHeader>
        {apiKey === null ? (
          <LocationForm
            onSubmit={submit}
            serverError={serverError}
            fieldErrors={fieldErrors}
            isSubmitting={createLocation.isPending}
          />
        ) : (
          <>
            <p className="text-sm">The location was added.</p>
            <SensorKeyNotice apiKey={apiKey} />
            <DialogFooter>
              <Button onClick={onClose}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function AddOwnMeterDialog({
  location,
  onClose,
}: {
  location: LocationSummary
  onClose: () => void
}) {
  const createMeter = useCreateMeter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof MeterFormValues, string>>>({})

  const submit = async (values: MeterFormValues) => {
    setServerError(null)
    setFieldErrors({})
    try {
      await createMeter.mutateAsync(values)
      onClose()
    } catch (error) {
      const parsed = toFormServerError(error, METER_FIELDS, 'Could not add the meter')
      setFieldErrors(parsed.fields)
      setServerError(parsed.message)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add meter to {location.name}</DialogTitle>
          <DialogDescription>Enter the device identifier of the meter reader.</DialogDescription>
        </DialogHeader>
        <MeterForm
          locations={[{ id: location.id, name: location.name }]}
          onSubmit={submit}
          serverError={serverError}
          fieldErrors={fieldErrors}
          isSubmitting={createMeter.isPending}
        />
      </DialogContent>
    </Dialog>
  )
}
