import { useState } from 'react'
import { Button } from '@/components/ui/button'

/** Shows a new sensor key once. The key lives only in this component's props; it is never stored. */
export function SensorKeyNotice({ apiKey }: { apiKey: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(apiKey)
    setCopied(true)
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-destructive" role="alert">
        This key is shown only once. If you lose it, an administrator must generate a new one.
      </p>
      <code className="block break-all rounded-md border bg-muted p-3 text-sm">{apiKey}</code>
      <Button type="button" variant="outline" onClick={copy}>
        {copied ? 'Copied' : 'Copy key'}
      </Button>
    </div>
  )
}
