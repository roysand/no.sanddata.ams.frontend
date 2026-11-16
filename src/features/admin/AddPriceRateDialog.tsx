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
import { usePriceRateActions } from './hooks'
import { amountOf } from './norgesPris'
import { PastDateConfirm } from './PastDateConfirm'
import { kindLabel, percentToFraction } from './pricing'
import { createPriceRateSchema, type PriceRateFormValues } from './schema'
import type { PriceRateKind } from './types'

const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/

export function AddPriceRateDialog({
  priceKind,
  onClose,
}: {
  priceKind: PriceRateKind
  onClose: () => void
}) {
  const { add } = usePriceRateActions()
  const [serverError, setServerError] = useState<string | null>(null)
  // The Norwegian date: a start date on or before it changes how past hours are priced.
  const [today] = useState(() => lastOsloDays(new Date(), 1)[0])
  const schema = useMemo(() => createPriceRateSchema(today, priceKind), [today, priceKind])
  const isVat = priceKind === 'Vat'

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PriceRateFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { validFrom: '', value: '', confirmPast: false },
  })

  const validFrom = useWatch({ control, name: 'validFrom' })
  const startsInThePast = DATE_FORMAT.test(validFrom) && validFrom <= today

  const onSubmit = async (values: PriceRateFormValues) => {
    setServerError(null)
    // VAT is typed as a percentage and sent as a fraction; the fees are sent as typed.
    const value = isVat ? percentToFraction(values.value) : amountOf(values.value)
    if (value === null) return

    try {
      await add.mutateAsync({
        kind: priceKind,
        validFrom: values.validFrom,
        value,
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
          <DialogTitle>Add {kindLabel(priceKind)} rate</DialogTitle>
          <DialogDescription>
            The value applies from the start date until a later row takes over.
            {isVat ? ' VAT is a percentage.' : ' It is in NOK per kWh.'}
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

          <div className="space-y-2">
            <Label htmlFor="value">{isVat ? 'VAT (%)' : 'Value (kr/kWh)'}</Label>
            <Input
              id="value"
              inputMode="decimal"
              autoComplete="off"
              placeholder={isVat ? '25' : '0,0713'}
              {...register('value')}
            />
            {errors.value && <p className="text-sm text-destructive">{errors.value.message}</p>}
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
