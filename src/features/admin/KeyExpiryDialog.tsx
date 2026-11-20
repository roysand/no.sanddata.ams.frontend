import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSetKeyExpiry } from './hooks'
import {
  isKeyExpiryError,
  keyExpiryLimits,
  keyExpirySchema,
  type KeyExpiryFormValues,
} from './schema'

/**
 * Changes only the date the water heater's OSO key is valid until, for example after a typo or when OSO extends the
 * key. The key itself is not asked for, and OSO is not called.
 */
export function KeyExpiryDialog({
  locationId,
  locationName,
  current,
  onClose,
}: {
  locationId: string
  locationName: string
  current: string
  onClose: () => void
}) {
  const setExpiry = useSetKeyExpiry(locationId)
  const [serverError, setServerError] = useState<string | null>(null)
  const limits = keyExpiryLimits()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<KeyExpiryFormValues>({
    resolver: zodResolver(keyExpirySchema),
    defaultValues: { keyExpiresOn: current },
  })

  const onSubmit = async (values: KeyExpiryFormValues) => {
    setServerError(null)
    try {
      await setExpiry.mutateAsync(values.keyExpiresOn)
      onClose()
    } catch (error) {
      if (error instanceof ApiError && isKeyExpiryError(error.code, error.message)) {
        setError('keyExpiresOn', { message: error.message })
      } else if (error instanceof ApiError && error.fieldErrors?.keyExpiresOn?.length) {
        setError('keyExpiresOn', { message: error.fieldErrors.keyExpiresOn.join(' ') })
      } else {
        setServerError(error instanceof Error ? error.message : 'Could not change the date')
      }
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !setExpiry.isPending && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Water heater key for {locationName}</DialogTitle>
          <DialogDescription>
            The last day the OSO key is valid. The key itself is not changed.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="keyExpiryDate">Key valid until</Label>
            <Input
              id="keyExpiryDate"
              type="date"
              min={limits.min}
              max={limits.max}
              {...register('keyExpiresOn')}
            />
            {errors.keyExpiresOn && (
              <p className="text-sm text-destructive">{errors.keyExpiresOn.message}</p>
            )}
          </div>
          {serverError && (
            <p className="text-sm text-destructive" role="alert">
              {serverError}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={setExpiry.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={setExpiry.isPending}>
              {setExpiry.isPending ? 'Saving…' : 'Save date'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
