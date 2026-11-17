import { useMemo, useState } from 'react'
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Trash2Icon } from 'lucide-react'
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
import { useCapacityStepActions } from './hooks'
import { parseAmount } from './norgesPris'
import { PastDateConfirm } from './PastDateConfirm'
import {
  amountExclVat,
  createCapacityStepsSchema,
  lowerBounds,
  toCapacityStepTableInput,
  type CapacityStepsFormValues,
} from './schema'
import type { GridTariff } from './types'

const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/
const MAX_STEPS = 50
const kw = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 4 })
const exclVat = new Intl.NumberFormat('nb-NO', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
})

/**
 * Adds a capacity step table to a grid tariff. Each row is typed as "up to (kW)" and the amount: the row starts where
 * the previous one ends and the last row has no upper limit, so the table is always one the API accepts.
 */
export function AddCapacityStepsDialog({
  tariff,
  onClose,
}: {
  tariff: GridTariff
  onClose: () => void
}) {
  const { add } = useCapacityStepActions(tariff.id)
  const [serverError, setServerError] = useState<string | null>(null)
  // The Norwegian date: a start date on or before it changes the charge of months already shown.
  const [today] = useState(() => lastOsloDays(new Date(), 1)[0])
  const schema = useMemo(() => createCapacityStepsSchema(today), [today])

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CapacityStepsFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      validFrom: '',
      confirmPast: false,
      amountsIncludeVat: false,
      rows: [
        { upperKw: '', amount: '' },
        { upperKw: '', amount: '' },
      ],
    },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'rows' })

  const validFrom = useWatch({ control, name: 'validFrom' })
  const rows = useWatch({ control, name: 'rows' })
  const includesVat = useWatch({ control, name: 'amountsIncludeVat' })
  const startsInThePast = DATE_FORMAT.test(validFrom) && validFrom <= today
  const lowers = lowerBounds(rows)
  const last = fields.length - 1

  const onSubmit = async (values: CapacityStepsFormValues) => {
    setServerError(null)
    try {
      await add.mutateAsync(toCapacityStepTableInput(values, startsInThePast))
      onClose()
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : 'Could not add the steps')
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add capacity steps to {tariff.name}</DialogTitle>
          <DialogDescription>
            The monthly capacity charge for each step of the average of the three highest daily
            peaks, from the start date until a later table takes over. The API stores the amounts
            excluding VAT; grid companies usually publish them including VAT.
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

          <div className="flex items-start gap-2">
            <Controller
              control={control}
              name="amountsIncludeVat"
              render={({ field }) => (
                <Checkbox
                  id="amountsIncludeVat"
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                />
              )}
            />
            <Label htmlFor="amountsIncludeVat" className="leading-snug">
              Amounts include VAT (divide by 1,25)
            </Label>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="pb-1 font-medium">From (kW)</th>
                <th className="pb-1 font-medium">Up to (kW)</th>
                <th className="pb-1 font-medium">Amount per month (kr)</th>
                {includesVat && <th className="pb-1 font-medium">Excl. VAT</th>}
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {fields.map((field, i) => {
                const amount = rows[i]?.amount ?? ''
                const rowErrors = errors.rows?.[i]
                return (
                  <tr key={field.id} className="align-top">
                    <td className="py-1 pr-2 tabular-nums">{kw.format(lowers[i] ?? 0)}</td>
                    <td className="py-1 pr-2">
                      {i === last ? (
                        <span className="text-muted-foreground">and above</span>
                      ) : (
                        <Input
                          aria-label={`Step ${i + 1} up to (kW)`}
                          inputMode="decimal"
                          autoComplete="off"
                          {...register(`rows.${i}.upperKw`)}
                        />
                      )}
                      {rowErrors?.upperKw && (
                        <p className="text-xs text-destructive">{rowErrors.upperKw.message}</p>
                      )}
                    </td>
                    <td className="py-1 pr-2">
                      <Input
                        aria-label={`Step ${i + 1} amount per month`}
                        inputMode="decimal"
                        autoComplete="off"
                        {...register(`rows.${i}.amount`)}
                      />
                      {rowErrors?.amount && (
                        <p className="text-xs text-destructive">{rowErrors.amount.message}</p>
                      )}
                    </td>
                    {includesVat && (
                      <td className="py-1 pr-2 tabular-nums" aria-label={`Step ${i + 1} excl. VAT`}>
                        {parseAmount(amount) === null
                          ? '–'
                          : exclVat.format(amountExclVat(amount, true))}
                      </td>
                    )}
                    <td className="py-1">
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove step ${i + 1}`}
                          onClick={() => remove(i)}
                        >
                          <Trash2Icon className="size-4" aria-hidden="true" />
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {errors.rows?.root && (
            <p className="text-sm text-destructive">{errors.rows.root.message}</p>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={fields.length >= MAX_STEPS}
            onClick={() => append({ upperKw: '', amount: '' })}
          >
            Add step
          </Button>

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
              {isSubmitting ? 'Adding…' : 'Add steps'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
