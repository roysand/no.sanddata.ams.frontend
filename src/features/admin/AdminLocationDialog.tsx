import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ConfirmDeactivateDialog,
  LocationForm,
  toFormServerError,
  type AdminLocation,
  type LocationFormValues,
} from '../locations'
import { useUpdateLocationAsAdmin } from './hooks'

const LOCATION_FIELDS = ['name', 'address', 'serialNumber', 'zone'] as const

/** Lets an administrator change every field of a location. The sensor key is shown as facts only. */
export function AdminLocationDialog({
  location,
  onClose,
}: {
  location: AdminLocation
  onClose: () => void
}) {
  const update = useUpdateLocationAsAdmin()
  const [serverError, setServerError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof LocationFormValues, string>>>(
    {},
  )
  // Values waiting for the administrator to confirm that the location will be switched off.
  const [pendingDeactivation, setPendingDeactivation] = useState<LocationFormValues | null>(null)

  const save = async (values: LocationFormValues) => {
    setServerError(null)
    setFieldErrors({})
    setPendingDeactivation(null)
    try {
      await update.mutateAsync({ id: location.id, input: values })
      onClose()
    } catch (error) {
      const parsed = toFormServerError(error, LOCATION_FIELDS, 'Could not save the location')
      setFieldErrors(parsed.fields)
      setServerError(parsed.message)
    }
  }

  const submit = (values: LocationFormValues) => {
    if (location.isActive && !values.isActive) {
      setPendingDeactivation(values)
      return
    }
    return save(values)
  }

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {location.name}</DialogTitle>
            <DialogDescription>
              Changing the price zone or the Norgespris agreement changes how past hours are priced.
            </DialogDescription>
          </DialogHeader>

          <LocationForm
            submitLabel="Save"
            defaultValues={{
              name: location.name,
              address: location.address,
              serialNumber: location.serialNumber,
              zone: location.zone as LocationFormValues['zone'],
              hasNorgesPriceAgreement: location.hasNorgesPriceAgreement,
              isActive: location.isActive,
            }}
            onSubmit={submit}
            serverError={serverError}
            fieldErrors={fieldErrors}
            isSubmitting={update.isPending}
          />

          {location.apiKey && (
            <p className="text-xs text-muted-foreground">
              Sensor key …{location.apiKey.hint} · {location.apiKey.status}
            </p>
          )}
        </DialogContent>
      </Dialog>

      {pendingDeactivation && (
        <ConfirmDeactivateDialog
          locationName={location.name}
          isPending={update.isPending}
          onConfirm={() => save(pendingDeactivation)}
          onCancel={() => setPendingDeactivation(null)}
        />
      )}
    </>
  )
}
