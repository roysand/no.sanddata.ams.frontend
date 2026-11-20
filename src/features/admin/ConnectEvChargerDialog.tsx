import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Skeleton } from '@/components/ui/skeleton'
import { useZaptecChargers } from './hooks'
import { evChargerSchema, type EvChargerFormValues } from './schema'

/**
 * Connects or replaces a location's Zaptec car charger, picked from the chargers the server's Zaptec sign-in sees. The
 * sign-in is the server's own: nothing secret is typed here.
 */
export function ConnectEvChargerDialog({
  locationName,
  isReplace,
  connect,
  isPending,
  onDone,
  onCancel,
}: {
  locationName: string
  isReplace: boolean
  connect: (chargerId: string) => Promise<unknown>
  isPending: boolean
  onDone: () => void
  onCancel: () => void
}) {
  const chargers = useZaptecChargers(true)
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<EvChargerFormValues>({
    resolver: zodResolver(evChargerSchema),
    defaultValues: { chargerId: '' },
  })

  const onSubmit = async ({ chargerId }: EvChargerFormValues) => {
    setServerError(null)
    try {
      await connect(chargerId)
      onDone()
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Could not connect the charger')
    }
  }

  const list = chargers.data ?? []

  return (
    // While Zaptec is being asked, closing would hide the answer; Cancel and Escape wait until it comes.
    <Dialog open onOpenChange={(open) => !open && !isPending && onCancel()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isReplace
              ? `Replace the car charger at ${locationName}`
              : `Connect a car charger to ${locationName}`}
          </DialogTitle>
          <DialogDescription>
            {isReplace
              ? 'The charger you pick replaces the one connected now. Its charging history is read back.'
              : "Pick the charger from the ones the server's Zaptec sign-in can see. Its charging history is read back."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {chargers.isLoading ? (
            <div className="space-y-2" aria-busy="true">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-5 w-1/2" />
            </div>
          ) : chargers.error ? (
            <p className="text-sm text-destructive" role="alert">
              {chargers.error.message}
            </p>
          ) : list.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              The server's Zaptec sign-in sees no chargers.
            </p>
          ) : (
            <Controller
              control={control}
              name="chargerId"
              render={({ field }) => (
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  aria-label="Charger"
                  aria-invalid={!!errors.chargerId}
                >
                  {list.map((charger) => (
                    <div key={charger.chargerId} className="flex items-center gap-3">
                      <RadioGroupItem
                        value={charger.chargerId}
                        id={`charger-${charger.chargerId}`}
                      />
                      <Label htmlFor={`charger-${charger.chargerId}`} className="font-normal">
                        {charger.name} · {charger.installationName}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            />
          )}
          {errors.chargerId && (
            <p className="text-sm text-destructive">{errors.chargerId.message}</p>
          )}

          {serverError && (
            <p className="text-sm text-destructive" role="alert">
              {serverError}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || list.length === 0}>
              {isPending
                ? 'Checking with Zaptec…'
                : isReplace
                  ? 'Replace charger'
                  : 'Connect charger'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
