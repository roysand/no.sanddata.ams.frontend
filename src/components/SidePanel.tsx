import { useRef, type ReactNode } from 'react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SidePanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: ReactNode
}

/**
 * A right-hand panel built on the Radix dialog: it closes on Escape, an outside tap or the Close button,
 * keeps keyboard focus inside while open and returns focus to the control that opened it.
 */
export function SidePanel({ open, onOpenChange, title, children }: SidePanelProps) {
  const opener = useRef<HTMLElement | null>(null)
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          // Radix only returns focus to a Trigger; this panel is opened from outside, so remember the opener.
          onOpenAutoFocus={() => {
            opener.current = document.activeElement as HTMLElement | null
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            opener.current?.focus()
          }}
          className="fixed inset-y-0 right-0 z-50 flex w-[min(21rem,88vw)] flex-col gap-1 overflow-y-auto border-l bg-popover p-4 pr-[max(1rem,env(safe-area-inset-right))] pb-[max(1rem,env(safe-area-inset-bottom))] text-popover-foreground outline-none data-open:animate-in data-open:slide-in-from-right-8 data-closed:animate-out data-closed:slide-out-to-right-8 motion-reduce:animate-none"
        >
          <div className="flex items-center justify-between gap-3">
            <DialogPrimitive.Title className="min-w-0 truncate text-base font-semibold">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon-lg" aria-label="Close" className="size-11">
                <XIcon />
              </Button>
            </DialogPrimitive.Close>
          </div>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
