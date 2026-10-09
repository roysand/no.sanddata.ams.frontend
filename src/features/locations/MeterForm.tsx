import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { meterSchema, type MeterFormValues } from './schema'

interface MeterFormProps {
  locations: { id: string; name: string }[]
  onSubmit: (values: MeterFormValues) => void | Promise<void>
  submitLabel?: string
  serverError?: string | null
  /** Messages the API attached to individual fields. */
  fieldErrors?: Partial<Record<keyof MeterFormValues, string>>
  isSubmitting?: boolean
}

export function MeterForm({
  locations,
  onSubmit,
  submitLabel = 'Add meter',
  serverError,
  fieldErrors,
  isSubmitting,
}: MeterFormProps) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting: submitting },
  } = useForm<MeterFormValues>({
    resolver: zodResolver(meterSchema),
    defaultValues: {
      locationId: locations.length === 1 ? locations[0].id : '',
      deviceId: '',
      comment: '',
    },
  })

  useEffect(() => {
    for (const [field, message] of Object.entries(fieldErrors ?? {})) {
      setError(field as keyof MeterFormValues, { type: 'server', message })
    }
  }, [fieldErrors, setError])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="locationId">Location</Label>
        <Controller
          control={control}
          name="locationId"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="locationId" aria-label="Location">
                <SelectValue placeholder="Choose a location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.locationId && (
          <p className="text-sm text-destructive">{errors.locationId.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="deviceId">Device id</Label>
        <Input
          id="deviceId"
          placeholder="e.g. 58:CF:79:9C:93:AE"
          autoComplete="off"
          {...register('deviceId')}
        />
        {errors.deviceId && <p className="text-sm text-destructive">{errors.deviceId.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="comment">Comment (optional)</Label>
        <Input id="comment" autoComplete="off" {...register('comment')} />
        {errors.comment && <p className="text-sm text-destructive">{errors.comment.message}</p>}
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
