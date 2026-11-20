import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/** Asks before the car charger connection is removed; the charging already read stays. */
export function RemoveEvChargerDialog({
  locationName,
  isPending,
  error,
  onConfirm,
  onCancel,
}: {
  locationName: string
  isPending: boolean
  error: string | null
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove car charger</DialogTitle>
          <DialogDescription>
            Remove the car charger from {locationName}? Charging already read is kept, and the car
            is no longer counted with the house.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Removing…' : 'Remove charger'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
