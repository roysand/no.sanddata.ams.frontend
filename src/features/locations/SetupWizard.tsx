import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
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

type Step =
  | { kind: 'location' }
  // The key lives only in this step's state; leaving the step drops it.
  | { kind: 'key'; apiKey: string; locationId: string }
  | { kind: 'meter'; locationId: string }
  | { kind: 'done' }

/** Resume at the meter step when the user already has a location without a meter. */
function initialStep(locations: LocationSummary[]): Step {
  const unfinished = locations.find((location) => location.meters.length === 0)
  return unfinished ? { kind: 'meter', locationId: unfinished.id } : { kind: 'location' }
}

export function SetupWizard() {
  const { data: locations, isLoading, error } = useLocations()

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>
  if (error || !locations) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {error?.message ?? 'Could not load your locations'}
      </p>
    )
  }

  return <WizardSteps locations={locations} />
}

function WizardSteps({ locations }: { locations: LocationSummary[] }) {
  const createLocation = useCreateOwnLocation()
  const createMeter = useCreateMeter()
  const [step, setStep] = useState<Step>(() => initialStep(locations))
  const [serverError, setServerError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const clearErrors = () => {
    setServerError(null)
    setFieldErrors({})
  }

  const submitLocation = async (values: LocationFormValues) => {
    clearErrors()
    try {
      const created = await createLocation.mutateAsync(values)
      setStep({ kind: 'key', apiKey: created.apiKey, locationId: created.location.id })
    } catch (error) {
      const parsed = toFormServerError(error, LOCATION_FIELDS, 'Could not add the location')
      setFieldErrors(parsed.fields)
      setServerError(parsed.message)
    }
  }

  const submitMeter = async (values: MeterFormValues) => {
    clearErrors()
    try {
      await createMeter.mutateAsync(values)
      setStep({ kind: 'done' })
    } catch (error) {
      const parsed = toFormServerError(error, METER_FIELDS, 'Could not add the meter')
      setFieldErrors(parsed.fields)
      setServerError(parsed.message)
    }
  }

  if (step.kind === 'location') {
    if (hasReachedLocationLimit(locations.length)) {
      return (
        <p className="text-sm" role="status">
          {LOCATION_LIMIT_MESSAGE}
        </p>
      )
    }
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Step 1 of 2: add your location</h2>
        <LocationForm
          onSubmit={submitLocation}
          serverError={serverError}
          fieldErrors={fieldErrors}
          isSubmitting={createLocation.isPending}
        />
      </div>
    )
  }

  if (step.kind === 'key') {
    const { locationId } = step
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Your location was added</h2>
        <p className="text-sm">
          Copy the sensor key below and enter it in the MQTTForwarder app on your meter reader.
        </p>
        <SensorKeyNotice apiKey={step.apiKey} />
        <Button
          onClick={() => {
            clearErrors()
            setStep({ kind: 'meter', locationId })
          }}
        >
          I have saved the key, continue
        </Button>
      </div>
    )
  }

  if (step.kind === 'meter') {
    const location = locations.find((l) => l.id === step.locationId)
    // The list refreshes after the location is created; until it arrives, the form falls back to a generic name.
    const options = [{ id: step.locationId, name: location?.name ?? 'Your new location' }]
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Step 2 of 2: add your meter</h2>
        <MeterForm
          key={step.locationId}
          locations={options}
          onSubmit={submitMeter}
          serverError={serverError}
          fieldErrors={fieldErrors}
          isSubmitting={createMeter.isPending}
        />
        <Button variant="link" asChild className="px-0">
          <Link to="/">Skip for now, I will add the meter later</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">All set</h2>
      <p className="text-sm">Your meter was added. Data appears once the meter starts sending.</p>
      <Button asChild>
        <Link to="/">Go to the dashboard</Link>
      </Button>
    </div>
  )
}
