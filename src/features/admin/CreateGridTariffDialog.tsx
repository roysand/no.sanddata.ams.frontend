import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ApiError } from '../../lib/apiClient'
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
import { gridTariffSchema, type GridTariffFormValues } from './schema'

export function CreateGridTariffDialog({ onClose }: { onClose: () => void }) {
  const { create } = useGridTariffActions()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GridTariffFormValues>({
    resolver: zodResolver(gridTariffSchema),
    defaultValues: { name: '' },
  })

  const onSubmit = async (values: GridTariffFormValues) => {
    setServerError(null)
    try {
      await create.mutateAsync(values.name)
      onClose()
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : 'Could not create the tariff')
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New tariff</DialogTitle>
          <DialogDescription>
            A tariff of a grid company. Add its rates afterwards. The name cannot be changed later.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              autoComplete="off"
              placeholder="Elvia, household"
              {...register('name')}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          {serverError && <p className="text-sm text-destructive">{serverError}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating…' : 'Create tariff'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
