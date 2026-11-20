import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatOsloDate } from '../dashboard'
import { SensorKeyNotice } from '../locations'
import { useRotateSensorKey } from './hooks'

/**
 * Replaces a location's sensor key in two steps: confirm, because the old key stops working at once, then show the new
 * key once. The key is only the mutation's result; closing resets the mutation, so it is gone with the dialog.
 */
export function ReplaceSensorKeyDialog({
  locationId,
  locationName,
  onClose,
}: {
  locationId: string
  locationName: string
  onClose: () => void
}) {
  const rotate = useRotateSensorKey(locationId)
  const close = () => {
    rotate.reset()
    onClose()
  }
  const rotated = rotate.data

  return (
    <Dialog open onOpenChange={(open) => !open && !rotate.isPending && close()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        {rotated ? (
          <>
            <DialogHeader>
              <DialogTitle>New sensor key for {locationName}</DialogTitle>
              <DialogDescription>
                Enter it in the MQTTForwarder app on the location's reader.
              </DialogDescription>
            </DialogHeader>
            <SensorKeyNotice apiKey={rotated.apiKey} />
            <p className="text-sm text-muted-foreground">
              Valid until {formatOsloDate(rotated.expiresAt)}.
            </p>
            <DialogFooter>
              <Button type="button" onClick={close}>
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Replace the sensor key for {locationName}?</DialogTitle>
              <DialogDescription>
                The current key stops working at once. Readings are refused until the reader's
                forwarder has the new key.
              </DialogDescription>
            </DialogHeader>
            {rotate.error && (
              <p className="text-sm text-destructive" role="alert">
                {rotate.error.message || 'Could not replace the sensor key'}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={close} disabled={rotate.isPending}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => rotate.mutate()}
                disabled={rotate.isPending}
              >
                {rotate.isPending ? 'Replacing…' : 'Replace key'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
