import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ApiError } from '../../lib/apiClient'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDeactivateDialog } from './ConfirmDeactivateDialog'
import { useUpdateOwnLocation } from './hooks'
import { ownerLocationSchema, type OwnerLocationFormValues } from './schema'
import { toFormServerError } from './serverErrors'
import type { LocationSummary } from './types'

const FIELDS = ['name', 'address'] as const

/**
 * An owner changes name, address and the active flag. Serial number, price zone and the Norgespris agreement
 * are shown as text only (an administrator changes them), and the sensor key is never part of this screen.
 */
export function EditLocationDialog({
  location,
  onClose,
}: {
  location: LocationSummary
  onClose: () => void
}) {
  const update = useUpdateOwnLocation()
  const [serverError, setServerError] = useState<string | null>(null)
  // Values waiting for the owner to confirm that the location will be switched off.
  const [pendingDeactivation, setPendingDeactivation] = useState<OwnerLocationFormValues | null>(
    null,
  )
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<OwnerLocationFormValues>({
    resolver: zodResolver(ownerLocationSchema),
    defaultValues: { name: location.name, address: location.address, isActive: location.isActive },
  })

  const save = async (values: OwnerLocationFormValues) => {
    setServerError(null)
    setPendingDeactivation(null)
    try {
      await update.mutateAsync({ id: location.id, ...values })
      onClose()
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        // The list reloads and the location disappears from the page, which closes this dialog.
        setServerError('You can no longer edit this location')
        return
      }
      const parsed = toFormServerError(error, FIELDS, 'Could not save the location')
      for (const [field, message] of Object.entries(parsed.fields)) {
        setError(field as (typeof FIELDS)[number], { type: 'server', message })
      }
      setServerError(parsed.message)
    }
  }

  const submit = (values: OwnerLocationFormValues) => {
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
              Serial number, price zone and the Norgespris agreement are changed by an
              administrator.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" autoComplete="off" {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" autoComplete="off" {...register('address')} />
              {errors.address && (
                <p className="text-sm text-destructive">{errors.address.message}</p>
              )}
            </div>

            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Serial number</dt>
              <dd>{location.serialNumber}</dd>
              <dt className="text-muted-foreground">Price zone</dt>
              <dd>{location.zone}</dd>
              <dt className="text-muted-foreground">Norgespris agreement</dt>
              <dd>{location.hasNorgesPriceAgreement ? 'Yes' : 'No'}</dd>
            </dl>

            <div className="flex items-center gap-2">
              <Controller
                control={control}
                name="isActive"
                render={({ field }) => (
                  <Checkbox
                    id="isActive"
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                  />
                )}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>

            {serverError && (
              <p className="text-sm text-destructive" role="alert">
                {serverError}
              </p>
            )}

            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? 'Saving…' : 'Save'}
            </Button>
          </form>
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
