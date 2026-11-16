import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

/**
 * Shown by every add dialog when the start date is today or earlier (in Norway): such a row changes how hours that are
 * already shown are priced, so the person must tick the box before the request is sent with `confirmPastDate`. The
 * API refuses such a row without it too.
 */
export function PastDateConfirm<T extends FieldValues>({
  control,
  name,
  error,
}: {
  control: Control<T>
  name: Path<T>
  error?: string
}) {
  return (
    <div role="alert" className="space-y-3 rounded-lg border border-destructive/40 p-3">
      <p className="text-sm font-medium">
        This start date is today or earlier. Costs shown for past hours will be recalculated.
      </p>
      <div className="flex items-start gap-2">
        <Controller
          control={control}
          name={name}
          render={({ field }) => (
            <Checkbox
              id="confirmPast"
              checked={field.value === true}
              onCheckedChange={(checked) => field.onChange(checked === true)}
            />
          )}
        />
        <Label htmlFor="confirmPast" className="leading-snug">
          I understand that costs shown for past hours will be recalculated
        </Label>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
