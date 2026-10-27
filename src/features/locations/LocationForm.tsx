import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ZONES, locationSchema, type LocationFormValues } from './schema'

interface LocationFormProps {
  onSubmit: (values: LocationFormValues) => void | Promise<void>
  submitLabel?: string
  serverError?: string | null
  /** Messages the API attached to individual fields. */
  fieldErrors?: Partial<Record<keyof LocationFormValues, string>>
  isSubmitting?: boolean
  /** Start values, for editing an existing location. */
  defaultValues?: Partial<LocationFormValues>
}

export function LocationForm({
  onSubmit,
  submitLabel = 'Add location',
  serverError,
  fieldErrors,
  isSubmitting,
  defaultValues,
}: LocationFormProps) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting: submitting },
  } = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name: '',
      address: '',
      serialNumber: '',
      hasNorgesPriceAgreement: false,
      isActive: true,
      ...defaultValues,
    },
  })

  useEffect(() => {
    for (const [field, message] of Object.entries(fieldErrors ?? {})) {
      setError(field as keyof LocationFormValues, { type: 'server', message })
    }
  }, [fieldErrors, setError])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" autoComplete="off" {...register('name')} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input id="address" autoComplete="off" {...register('address')} />
        {errors.address && <p className="text-sm text-destructive">{errors.address.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="serialNumber">Serial number</Label>
        <Input id="serialNumber" autoComplete="off" {...register('serialNumber')} />
        {errors.serialNumber && (
          <p className="text-sm text-destructive">{errors.serialNumber.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="zone">Price zone</Label>
        <Controller
          control={control}
          name="zone"
          render={({ field }) => (
            <Select value={field.value ?? ''} onValueChange={field.onChange}>
              <SelectTrigger id="zone" aria-label="Price zone">
                <SelectValue placeholder="Choose a zone" />
              </SelectTrigger>
              <SelectContent>
                {ZONES.map((zone) => (
                  <SelectItem key={zone} value={zone}>
                    {zone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.zone && <p className="text-sm text-destructive">{errors.zone.message}</p>}
      </div>
      <div className="flex items-center gap-2">
        <Controller
          control={control}
          name="hasNorgesPriceAgreement"
          render={({ field }) => (
            <Checkbox
              id="hasNorgesPriceAgreement"
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked === true)}
            />
          )}
        />
        <Label htmlFor="hasNorgesPriceAgreement">Has a Norgespris agreement</Label>
      </div>
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

      <Button type="submit" disabled={isSubmitting || submitting}>
        {isSubmitting || submitting ? 'Saving…' : submitLabel}
      </Button>
    </form>
  )
}
