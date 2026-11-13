import { LogOutIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SidePanel } from './SidePanel'

interface AccountPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  email: string
  roleLabel: string
  onSignOut: () => void
}

export function AccountPanel({
  open,
  onOpenChange,
  email,
  roleLabel,
  onSignOut,
}: AccountPanelProps) {
  return (
    <SidePanel open={open} onOpenChange={onOpenChange} title={email}>
      <p className="text-sm text-muted-foreground">{roleLabel}</p>
      <div className="flex-1" />
      <Button
        variant="ghost"
        className="h-12 justify-start gap-3 px-3 text-base text-destructive"
        onClick={onSignOut}
      >
        <LogOutIcon aria-hidden="true" />
        Sign out
      </Button>
    </SidePanel>
  )
}
