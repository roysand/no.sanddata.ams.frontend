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
import { useGridTariffActions } from './hooks'
import { formatRateDate } from './norgesPris'
import type { GridTariff, GridTariffRate } from './types'

export function DeleteGridTariffRateDialog({
  tariff,
  rate,
  onClose,
}: {
  tariff: GridTariff
  rate: GridTariffRate
  onClose: () => void
}) {
  const { removeRate } = useGridTariffActions()
  const [serverError, setServerError] = useState<string | null>(null)

  const confirm = async () => {
    setServerError(null)
    try {
      await removeRate.mutateAsync({ tariffId: tariff.id, rateId: rate.id })
      onClose()
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : 'Could not delete the rate')
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete rate</DialogTitle>
          <DialogDescription>
            Delete the rate of {tariff.name} that starts on {formatRateDate(rate.validFrom)}? It has
            not started, so no cost figure changes. Only rates that have not started can be deleted.
          </DialogDescription>
        </DialogHeader>

        {serverError && <p className="text-sm text-destructive">{serverError}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirm} disabled={removeRate.isPending}>
            {removeRate.isPending ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
