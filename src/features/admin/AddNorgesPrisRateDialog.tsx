import { useMemo, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ApiError } from '../../lib/apiClient'
import { lastOsloDays } from '../dashboard/format'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { useNorgesPrisActions } from './hooks'
import { amountOf } from './norgesPris'
import { createNorgesPrisRateSchema, type NorgesPrisRateFormValues } from './schema'

const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/

export function AddNorgesPrisRateDialog({ onClose }: { onClose: () => void }) {
  const { add } = useNorgesPrisActions()
  const [serverError, setServerError] = useState<string | null>(null)
  // The Norwegian date: a start date on or before it changes how past hours are priced.
  const [today] = useState(() => lastOsloDays(new Date(), 1)[0])
  const schema = useMemo(() => createNorgesPrisRateSchema(today), [today])

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NorgesPrisRateFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { validFrom: '', ratePerKwh: '', taxPerKwh: '', confirmPast: false },
  })

  const validFrom = useWatch({ control, name: 'validFrom' })
  const startsInThePast = DATE_FORMAT.test(validFrom) && validFrom <= today

  const onSubmit = async (values: NorgesPrisRateFormValues) => {
    setServerError(null)
    try {
      await add.mutateAsync({
        validFrom: values.validFrom,
        ratePerKwh: amountOf(values.ratePerKwh),
        taxPerKwh: amountOf(values.taxPerKwh),
        // Only meaningful for a past date; a box ticked before the date was changed must not leak through.
        confirmPastDate: startsInThePast && values.confirmPast,
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
          <DialogTitle>Add rate</DialogTitle>
          <DialogDescription>
            The rate applies from the start date until a later rate takes over. Rates are in NOK per
            kWh.
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
              <Label htmlFor="ratePerKwh">Rate (kr/kWh)</Label>
              <Input
                id="ratePerKwh"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0,50"
                {...register('ratePerKwh')}
              />
              {errors.ratePerKwh && (
                <p className="text-sm text-destructive">{errors.ratePerKwh.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxPerKwh">Tax (kr/kWh)</Label>
              <Input
                id="taxPerKwh"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0"
                {...register('taxPerKwh')}
              />
              {errors.taxPerKwh && (
                <p className="text-sm text-destructive">{errors.taxPerKwh.message}</p>
              )}
            </div>
          </div>

          {startsInThePast && (
            <div role="alert" className="space-y-3 rounded-lg border border-destructive/40 p-3">
              <p className="text-sm font-medium">
                This start date is today or earlier. Costs shown for past hours will be
                recalculated.
              </p>
              <div className="flex items-start gap-2">
                <Controller
                  control={control}
                  name="confirmPast"
                  render={({ field }) => (
                    <Checkbox
                      id="confirmPast"
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                    />
                  )}
                />
                <Label htmlFor="confirmPast" className="leading-snug">
                  I understand that costs shown for past hours will be recalculated
                </Label>
              </div>
              {errors.confirmPast && (
                <p className="text-sm text-destructive">{errors.confirmPast.message}</p>
              )}
            </div>
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
