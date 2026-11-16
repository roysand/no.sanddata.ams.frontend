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
import { usePriceRateActions } from './hooks'
import { formatRateDate } from './norgesPris'
import { kindLabel } from './pricing'
import type { PriceRate } from './types'

export function DeletePriceRateDialog({ rate, onClose }: { rate: PriceRate; onClose: () => void }) {
  const { remove } = usePriceRateActions()
  const [serverError, setServerError] = useState<string | null>(null)

  const confirm = async () => {
    setServerError(null)
    try {
      await remove.mutateAsync(rate.id)
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
            Delete the {kindLabel(rate.kind)} row that starts on {formatRateDate(rate.validFrom)}?
            It has not started, so no cost figure changes. Only rows that have not started can be
            deleted.
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
