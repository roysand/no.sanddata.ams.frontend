import { useState } from 'react'
import { ApiError } from '../../lib/apiClient'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { MeterForm, useCreateMeter, type MeterFormValues } from '../locations'
import { userLocationOptions } from './locationOptions'
import type { AdminUser } from './types'

/** Registers a meter (reader) at one of the user's locations. */
export function AddMeterDialog({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const createMeter = useCreateMeter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [added, setAdded] = useState<string | null>(null)

  const submit = async (values: MeterFormValues) => {
    setServerError(null)
    try {
      const meter = await createMeter.mutateAsync({
        locationId: values.locationId,
        deviceId: values.deviceId,
        comment: values.comment?.trim() || undefined,
      })
      setAdded(meter.deviceId)
    } catch (error) {
      setServerError(
        error instanceof ApiError && error.status === 409
          ? 'A meter with this device id is already registered at this location'
          : error instanceof ApiError
            ? error.message
            : 'Could not add the meter',
      )
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Add meter for {user.firstName} {user.lastName}
          </DialogTitle>
          <DialogDescription>
            Registers a meter at one of {user.email}&apos;s locations so it can send measurements.
          </DialogDescription>
        </DialogHeader>

        {added === null ? (
          <MeterForm
            locations={userLocationOptions(user)}
            onSubmit={submit}
            serverError={serverError}
            isSubmitting={createMeter.isPending}
          />
        ) : (
          <>
            <p className="text-sm">Meter {added} was added.</p>
            <DialogFooter>
              <Button onClick={onClose}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
