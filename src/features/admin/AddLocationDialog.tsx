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
import { LocationForm, SensorKeyNotice, type LocationFormValues } from '../locations'
import { LocationNotLinkedError } from './api'
import { useUserActions } from './hooks'
import type { AdminUser } from './types'

type Stage =
  | { kind: 'form' }
  | { kind: 'done'; apiKey: string }
  | { kind: 'notLinked'; apiKey: string; locationId: string }

/** Adds a location for any user and links it to them. The sensor key lives only in this dialog's state. */
export function AddLocationDialog({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const { addLocation, link } = useUserActions()
  const [stage, setStage] = useState<Stage>({ kind: 'form' })
  const [serverError, setServerError] = useState<string | null>(null)

  const submit = async (values: LocationFormValues) => {
    setServerError(null)
    try {
      const created = await addLocation.mutateAsync({ userId: user.id, input: values })
      setStage({ kind: 'done', apiKey: created.apiKey })
    } catch (error) {
      if (error instanceof LocationNotLinkedError) {
        setStage({
          kind: 'notLinked',
          apiKey: error.created.apiKey,
          locationId: error.created.location.id,
        })
      } else {
        setServerError(error instanceof ApiError ? error.message : 'Could not add the location')
      }
    }
  }

  const retryLink = async (stageNow: Extract<Stage, { kind: 'notLinked' }>) => {
    setServerError(null)
    try {
      await link.mutateAsync({ userId: user.id, locationId: stageNow.locationId, linked: true })
      setStage({ kind: 'done', apiKey: stageNow.apiKey })
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : 'Could not link the location')
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Add location for {user.firstName} {user.lastName}
          </DialogTitle>
          <DialogDescription>
            {stage.kind === 'form'
              ? `The location is created and linked to ${user.email}.`
              : `Location for ${user.email}.`}
          </DialogDescription>
        </DialogHeader>

        {stage.kind === 'form' && (
          <LocationForm
            onSubmit={submit}
            serverError={serverError}
            isSubmitting={addLocation.isPending}
          />
        )}

        {stage.kind === 'done' && (
          <>
            <p className="text-sm">The location was added and linked.</p>
            <SensorKeyNotice apiKey={stage.apiKey} />
            <DialogFooter>
              <Button onClick={onClose}>Done</Button>
            </DialogFooter>
          </>
        )}

        {stage.kind === 'notLinked' && (
          <>
            <p className="text-sm text-destructive" role="alert">
              The location was created, but not linked to this user. Retry the link; if you close
              this dialog the location stays unlinked.
            </p>
            {serverError && <p className="text-sm text-destructive">{serverError}</p>}
            <SensorKeyNotice apiKey={stage.apiKey} />
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button onClick={() => retryLink(stage)} disabled={link.isPending}>
                {link.isPending ? 'Linking…' : 'Retry link'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
