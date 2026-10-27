import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ConfirmDeactivateDialogProps {
  locationName: string
  onConfirm: () => void
  onCancel: () => void
  isPending?: boolean
}

/** Shown before a location is switched off, by its owner or an administrator. */
export function ConfirmDeactivateDialog({
  locationName,
  onConfirm,
  onCancel,
  isPending,
}: ConfirmDeactivateDialogProps) {
  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deactivate {locationName}?</DialogTitle>
          <DialogDescription>
            A deactivated location stops accepting sensor readings and is hidden from the users who
            can only view it. You can activate it again later.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isPending}>
            Keep active
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Saving…' : 'Deactivate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
