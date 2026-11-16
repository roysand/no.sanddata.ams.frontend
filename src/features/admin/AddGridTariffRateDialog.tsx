import { useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ApiError } from '../../lib/apiClient'
import { lastOsloDays } from '../dashboard/format'
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
import { useGridTariffActions } from './hooks'
import { amountOf } from './norgesPris'
import { PastDateConfirm } from './PastDateConfirm'
import { createGridTariffRateSchema, type GridTariffRateFormValues } from './schema'
import type { GridTariff } from './types'

const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/

export function AddGridTariffRateDialog({
  tariff,
  onClose,
}: {
  tariff: GridTariff
  onClose: () => void
}) {
  const { addRate } = useGridTariffActions()
  const [serverError, setServerError] = useState<string | null>(null)
  // The Norwegian date: a start date on or before it changes how past hours are priced.
  const [today] = useState(() => lastOsloDays(new Date(), 1)[0])
  const schema = useMemo(() => createGridTariffRateSchema(today), [today])

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GridTariffRateFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { validFrom: '', dayRatePerKwh: '', nightRatePerKwh: '', confirmPast: false },
  })

  const validFrom = useWatch({ control, name: 'validFrom' })
  const startsInThePast = DATE_FORMAT.test(validFrom) && validFrom <= today

  const onSubmit = async (values: GridTariffRateFormValues) => {
    setServerError(null)
    try {
      await addRate.mutateAsync({
        tariffId: tariff.id,
        input: {
          validFrom: values.validFrom,
          dayRatePerKwh: amountOf(values.dayRatePerKwh),
          nightRatePerKwh: amountOf(values.nightRatePerKwh),
          // Only meaningful for a past date; a box ticked before the date was changed must not leak through.
          confirmPastDate: startsInThePast && values.confirmPast,
        },
      })
      onClose()
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : 'Could not add the rate')
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add rate to {tariff.name}</DialogTitle>
          <DialogDescription>
            The rates apply from the start date until a later rate takes over. Enter them in NOK per
            kWh excluding taxes and VAT: the electricity tax, the Enova fee and VAT are added
            separately, so a published rate that includes them must be converted first.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="validFrom">Start date</Label>
            <Input id="validFrom" type="date" {...register('validFrom')} />
            {errors.validFrom && (
              <p className="text-sm text-destructive">{errors.validFrom.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dayRatePerKwh">Day rate (kr/kWh)</Label>
              <Input
                id="dayRatePerKwh"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0,30"
                {...register('dayRatePerKwh')}
              />
              <p className="text-xs text-muted-foreground">Weekdays 06:00 to 22:00, not holidays</p>
              {errors.dayRatePerKwh && (
                <p className="text-sm text-destructive">{errors.dayRatePerKwh.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="nightRatePerKwh">Night and weekend rate (kr/kWh)</Label>
              <Input
                id="nightRatePerKwh"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0,20"
                {...register('nightRatePerKwh')}
              />
              <p className="text-xs text-muted-foreground">All other hours</p>
              {errors.nightRatePerKwh && (
                <p className="text-sm text-destructive">{errors.nightRatePerKwh.message}</p>
              )}
            </div>
          </div>

          {startsInThePast && (
            <PastDateConfirm
              control={control}
              name="confirmPast"
              error={errors.confirmPast?.message}
            />
          )}

          {serverError && <p className="text-sm text-destructive">{serverError}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding…' : 'Add rate'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
