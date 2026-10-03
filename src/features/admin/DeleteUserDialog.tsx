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
import { useUserActions } from './hooks'
import type { AdminUser } from './types'

export function DeleteUserDialog({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const { remove } = useUserActions()
  const [serverError, setServerError] = useState<string | null>(null)

  const confirm = async () => {
    setServerError(null)
    try {
      await remove.mutateAsync(user.id)
      onClose()
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : 'Could not delete the user')
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete user</DialogTitle>
          <DialogDescription>
            This permanently deletes {user.firstName} {user.lastName} ({user.email}) and their
            sign-ins. It cannot be undone. To keep the account but stop it signing in, deactivate it
            instead.
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
