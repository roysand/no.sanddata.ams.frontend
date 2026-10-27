import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ApiError } from '../../lib/apiClient'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUpdateMeterComment } from './hooks'
import { meterCommentSchema, type MeterCommentFormValues } from './schema'
import { toFormServerError } from './serverErrors'
import type { MeterSummary } from './types'

/** An owner changes the comment of one meter; the device id and the location cannot be changed. */
export function EditMeterCommentDialog({
  meter,
  onClose,
}: {
  meter: MeterSummary
  onClose: () => void
}) {
  const update = useUpdateMeterComment()
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<MeterCommentFormValues>({
    resolver: zodResolver(meterCommentSchema),
    defaultValues: { comment: meter.comment ?? '' },
  })

  const submit = async (values: MeterCommentFormValues) => {
    setServerError(null)
    try {
      await update.mutateAsync({ id: meter.id, comment: values.comment?.trim() || null })
      onClose()
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setServerError('You can no longer edit this meter')
        return
      }
      const parsed = toFormServerError(error, ['comment'] as const, 'Could not save the comment')
      if (parsed.fields.comment)
        setError('comment', { type: 'server', message: parsed.fields.comment })
      setServerError(parsed.message)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Comment for {meter.deviceId}</DialogTitle>
          <DialogDescription>A note to help you recognise this meter.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="comment">Comment</Label>
            <Input id="comment" autoComplete="off" {...register('comment')} />
            {errors.comment && <p className="text-sm text-destructive">{errors.comment.message}</p>}
          </div>
          {serverError && (
            <p className="text-sm text-destructive" role="alert">
              {serverError}
            </p>
          )}
          <Button type="submit" disabled={update.isPending}>
            {update.isPending ? 'Saving…' : 'Save'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
