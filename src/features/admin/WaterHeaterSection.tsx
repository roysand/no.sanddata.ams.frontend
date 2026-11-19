import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ApiError } from '../../lib/apiClient'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'
import { Skeleton } from '@/components/ui/skeleton'
import { formatOsloDate } from '../dashboard'
import type { AdminLocation } from '../locations'
import { RemoveWaterHeaterDialog } from './RemoveWaterHeaterDialog'
import { useWaterHeaterActions, useWaterHeaterSettings } from './hooks'
import { waterHeaterSchema, type WaterHeaterFormValues } from './schema'

const FIELDS = ['deviceId', 'subscriptionKey'] as const

/**
 * Connects, replaces and removes the OSO water heater of a location. The key is typed into the form, sent once, and
 * never shown or kept afterwards.
 */
export function WaterHeaterSection({ location }: { location: AdminLocation }) {
  const settings = useWaterHeaterSettings(location.id)
  const actions = useWaterHeaterActions(location.id)
  const [isFormOpen, setFormOpen] = useState(false)
  const [isConfirmingRemove, setConfirmingRemove] = useState(false)
  const [removeError, setRemoveError] = useState<string | null>(null)

  const closeForm = () => {
    actions.connect.reset()
    setFormOpen(false)
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
          {!isFormOpen && (
            <span className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setFormOpen(true)}>
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
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">No water heater connected</span>
          {!isFormOpen && (
            <Button variant="outline" size="sm" onClick={() => setFormOpen(true)}>
              Connect
            </Button>
          )}
        </div>
      )}

      {isFormOpen && (
        <ConnectForm
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

/** Its own component, so closing it unmounts the form and drops the typed key. */
function ConnectForm({
  connect,
  isPending,
  onDone,
  onCancel,
}: {
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
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-3 rounded-lg border p-3"
      noValidate
      autoComplete="off"
    >
      <div className="space-y-2">
        <Label htmlFor="waterHeaterDeviceId">Device id</Label>
        <Input
          id="waterHeaterDeviceId"
          autoComplete="off"
          spellCheck={false}
          className="font-mono"
          {...register('deviceId')}
        />
        {errors.deviceId && <p className="text-sm text-destructive">{errors.deviceId.message}</p>}
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
      <p className="text-xs text-muted-foreground">
        Both are in the OSO app or on OSO's website. OSO checks them before they are saved, which
        can take a few seconds.
      </p>

      {serverError && (
        <p className="text-sm text-destructive" role="alert">
          {serverError}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Checking with OSO…' : 'Connect heater'}
        </Button>
      </div>
    </form>
  )
}
