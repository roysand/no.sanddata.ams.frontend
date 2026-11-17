import { Badge } from '@/components/ui/badge'
import type { NorgesPrisStatus } from './types'

/** In effect, upcoming or superseded: the status the API computes from today in Norway. */
export function RateStatusBadge({ status }: { status: NorgesPrisStatus }) {
  if (status === 'InEffect') return <Badge>In effect</Badge>
  if (status === 'Upcoming') return <Badge variant="outline">Upcoming</Badge>
  return <Badge variant="secondary">Superseded</Badge>
}
