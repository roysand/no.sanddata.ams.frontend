import { useState } from 'react'
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
import { useCapacityStepActions } from './hooks'
import { formatRateDate } from './norgesPris'
import type { CapacityStepTable, GridTariff } from './types'

export function DeleteCapacityStepsDialog({
  tariff,
  table,
  onClose,
}: {
  tariff: GridTariff
  table: CapacityStepTable
  onClose: () => void
}) {
  const { remove } = useCapacityStepActions(tariff.id)
  const [serverError, setServerError] = useState<string | null>(null)

  const confirm = async () => {
    setServerError(null)
    try {
      await remove.mutateAsync(table.validFrom)
      onClose()
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : 'Could not delete the steps')
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete capacity steps</DialogTitle>
          <DialogDescription>
            Delete the capacity steps of {tariff.name} that start on{' '}
            {formatRateDate(table.validFrom)}? They have not started, so no charge changes. Only
            steps that have not started can be deleted.
          </DialogDescription>
        </DialogHeader>

        {serverError && <p className="text-sm text-destructive">{serverError}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirm} disabled={remove.isPending}>
            {remove.isPending ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
