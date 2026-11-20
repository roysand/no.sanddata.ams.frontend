import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { LocationAccessList } from './LocationAccessList'
import { SensorKeySection } from './SensorKeySection'
import { EvChargerSection } from './EvChargerSection'
import { WaterHeaterSection } from './WaterHeaterSection'
import { useUpdateLocationAsAdmin } from './hooks'

const LOCATION_FIELDS = ['name', 'address', 'serialNumber', 'zone'] as const
const FORM_ID = 'admin-location-form'

/** The section each key reminder leads to (spec 011, research R4). */
const KEY_SECTIONS = { sensor: 'sensor-key', heater: 'water-heater' } as const
export type FocusKey = keyof typeof KEY_SECTIONS

/**
 * Lets an administrator change every field of a location, and replace its sensor key. `focusKey` scrolls to that key's
 * section when the dialog is opened from a reminder.
 */
export function AdminLocationDialog({
  location,
  onClose,
  focusKey,
}: {
  location: AdminLocation
  onClose: () => void
  focusKey?: FocusKey
}) {
  useEffect(() => {
    if (!focusKey) return
    // After the dialog's content is in the document.
    const timer = setTimeout(() => {
      const section = document.getElementById(KEY_SECTIONS[focusKey])
      section?.scrollIntoView?.({ block: 'center' })
      section?.querySelector<HTMLElement>('h3')?.focus()
    }, 0)
    return () => clearTimeout(timer)
  }, [focusKey])

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
        {/* Taller than a phone screen with Access and Water heater, so it scrolls inside the viewport. */}
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit {location.name}</DialogTitle>
            <DialogDescription>
              Changing the price zone or the Norgespris agreement changes how past hours are priced.
            </DialogDescription>
          </DialogHeader>

          <LocationForm
            formId={FORM_ID}
            showSubmit={false}
            defaultValues={{
              name: location.name,
              address: location.address,
              serialNumber: location.serialNumber,
              zone: location.zone as LocationFormValues['zone'],
              hasNorgesPriceAgreement: location.hasNorgesPriceAgreement,
              isActive: location.isActive,
            }}
            onSubmit={submit}
            fieldErrors={fieldErrors}
            isSubmitting={update.isPending}
          />

          <LocationAccessList location={location} />

          <WaterHeaterSection location={location} />

          <EvChargerSection location={location} />

          <SensorKeySection location={location} />

          {/* Next to the buttons, so a refusal is seen where Save was pressed. */}
          {serverError && (
            <p className="text-sm text-destructive" role="alert">
              {serverError}
            </p>
          )}

          {/* Access, Water heater and Car charger save on their own; these buttons are for the location fields above. */}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" form={FORM_ID} disabled={update.isPending}>
              {update.isPending ? 'Saving…' : 'Save location'}
            </Button>
          </DialogFooter>
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
