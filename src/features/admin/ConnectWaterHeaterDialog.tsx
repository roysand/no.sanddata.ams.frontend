import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { PasswordInput } from '@/components/ui/password-input'
import { waterHeaterSchema, type WaterHeaterFormValues } from './schema'

const FIELDS = ['deviceId', 'subscriptionKey'] as const

/**
 * Connects or replaces a location's OSO water heater. Closing the dialog unmounts the form, which drops the typed key;
 * the fields always start empty, so an old key is never filled in.
 */
export function ConnectWaterHeaterDialog({
  locationName,
  isReplace,
  connect,
  isPending,
  onDone,
  onCancel,
}: {
  locationName: string
  isReplace: boolean
  connect: (values: WaterHeaterFormValues) => Promise<unknown>
  isPending: boolean
  onDone: () => void
  onCancel: () => void
}) {
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<WaterHeaterFormValues>({
    resolver: zodResolver(waterHeaterSchema),
    defaultValues: { deviceId: '', subscriptionKey: '' },
  })

  const onSubmit = async (values: WaterHeaterFormValues) => {
    setServerError(null)
    try {
      await connect(values)
      onDone()
    } catch (error) {
      if (!(error instanceof ApiError)) {
        setServerError('Could not connect the water heater')
        return
      }
      const fieldErrors = error.fieldErrors ?? {}
      const matched = FIELDS.filter((field) => fieldErrors[field]?.length)
      for (const field of matched) {
        setError(field, { message: fieldErrors[field].join(' ') })
      }
      if (matched.length === 0) setServerError(error.message)
    }
  }

  return (
    // While OSO is being asked, closing would hide the answer; Cancel and Escape wait until it comes.
    <Dialog open onOpenChange={(open) => !open && !isPending && onCancel()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isReplace ? 'Replace water heater' : 'Connect water heater'}</DialogTitle>
          <DialogDescription>
            {isReplace
              ? `The new key and device id replace the ones stored for ${locationName}.`
              : `Connect the OSO water heater at ${locationName}.`}{' '}
            Both are in the OSO app or on OSO's website. OSO checks them before they are saved,
            which can take a few seconds.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate autoComplete="off">
          <div className="space-y-2">
            <Label htmlFor="waterHeaterDeviceId">Device id</Label>
            <Input
              id="waterHeaterDeviceId"
              autoComplete="off"
              spellCheck={false}
              className="font-mono"
              {...register('deviceId')}
            />
            {errors.deviceId && (
              <p className="text-sm text-destructive">{errors.deviceId.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="waterHeaterKey">Subscription key</Label>
            <PasswordInput
              id="waterHeaterKey"
              autoComplete="off"
              spellCheck={false}
              data-1p-ignore=""
              data-lpignore="true"
              {...register('subscriptionKey')}
            />
            {errors.subscriptionKey && (
              <p className="text-sm text-destructive">{errors.subscriptionKey.message}</p>
            )}
          </div>

          {serverError && (
            <p className="text-sm text-destructive" role="alert">
              {serverError}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Checking with OSO…' : 'Connect heater'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
