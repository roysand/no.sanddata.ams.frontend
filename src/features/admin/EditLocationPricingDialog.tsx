import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { ApiError } from '../../lib/apiClient'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useGridTariffs, useSetLocationPricing } from './hooks'
import { amountOf } from './norgesPris'
import { locationPricingSchema, NO_TARIFF, type LocationPricingFormValues } from './schema'
import type { LocationPricing } from './types'

const FLAGS = [
  {
    name: 'electricityTaxExempt',
    label: 'Exempt from electricity tax',
    hint: 'No electricity tax; the Enova fee still applies.',
  },
  { name: 'vatExempt', label: 'Exempt from VAT', hint: 'No VAT on any part of the price.' },
  {
    name: 'isHolidayHome',
    label: 'Holiday home',
    hint: 'Lower Norgespris monthly limit (1 000 kWh instead of 5 000).',
  },
] as const

/** 0.02 -> "0,02": the way a Norwegian types it. */
const asInput = (value: number) => String(value).replace('.', ',')

export function EditLocationPricingDialog({
  location,
  onClose,
}: {
  location: LocationPricing
  onClose: () => void
}) {
  const tariffs = useGridTariffs()
  const { mutateAsync } = useSetLocationPricing()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LocationPricingFormValues>({
    resolver: zodResolver(locationPricingSchema),
    defaultValues: {
      gridTariffId: location.gridTariffId ?? NO_TARIFF,
      supplierMarkupPerKwh: asInput(location.supplierMarkupPerKwh),
      electricityTaxExempt: location.electricityTaxExempt,
      vatExempt: location.vatExempt,
      isHolidayHome: location.isHolidayHome,
    },
  })

  const onSubmit = async (values: LocationPricingFormValues) => {
    setServerError(null)
    try {
      await mutateAsync({
        locationId: location.locationId,
        input: {
          gridTariffId: values.gridTariffId === NO_TARIFF ? null : values.gridTariffId,
          supplierMarkupPerKwh: amountOf(values.supplierMarkupPerKwh),
          electricityTaxExempt: values.electricityTaxExempt,
          vatExempt: values.vatExempt,
          isHolidayHome: values.isHolidayHome,
        },
      })
      onClose()
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : 'Could not save the pricing')
    }
  }

  const noTariffsYet = tariffs.data?.length === 0

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pricing for {location.name}</DialogTitle>
          <DialogDescription>
            Changing these recalculates the costs shown for past hours of this location.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="gridTariffId">Grid tariff</Label>
            <Controller
              control={control}
              name="gridTariffId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="gridTariffId" aria-label="Grid tariff">
                    <SelectValue placeholder="Choose a tariff" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_TARIFF}>None</SelectItem>
                    {tariffs.data?.map((tariff) => (
                      <SelectItem key={tariff.id} value={tariff.id}>
                        {tariff.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.gridTariffId && (
              <p className="text-sm text-destructive">{errors.gridTariffId.message}</p>
            )}
            {noTariffsYet && (
              <p className="text-sm text-muted-foreground">
                No tariffs yet.{' '}
                <Link to="/admin/grid-tariffs" className="underline">
                  Add one on the Grid tariffs page
                </Link>
                .
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplierMarkupPerKwh">Supplier markup (kr/kWh excluding VAT)</Label>
            <Input
              id="supplierMarkupPerKwh"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0,02"
              {...register('supplierMarkupPerKwh')}
            />
            <p className="text-sm text-muted-foreground">
              Added on spot terms only; there is no markup under Norgespris.
            </p>
            {errors.supplierMarkupPerKwh && (
              <p className="text-sm text-destructive">{errors.supplierMarkupPerKwh.message}</p>
            )}
          </div>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">Exemptions and type</legend>
            {FLAGS.map((flag) => (
              <div key={flag.name} className="flex items-start gap-2">
                <Controller
                  control={control}
                  name={flag.name}
                  render={({ field }) => (
                    <Checkbox
                      id={flag.name}
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                    />
                  )}
                />
                <div className="grid gap-0.5">
                  <Label htmlFor={flag.name}>{flag.label}</Label>
                  <p className="text-xs text-muted-foreground">{flag.hint}</p>
                </div>
              </div>
            ))}
          </fieldset>

          {serverError && <p className="text-sm text-destructive">{serverError}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
