import { LocationsPage, useSelectedLocation } from '../locations'
import { Skeleton } from '@/components/ui/skeleton'
import { OverviewPage } from './OverviewPage'

/** The Locations tab: the all-locations overview for users with several active locations, otherwise the usual page. */
export function LocationsEntry() {
  const { hasMultiple, isLoading } = useSelectedLocation()

  if (isLoading) return <Skeleton className="h-40 w-full rounded-xl" aria-busy="true" />
  return hasMultiple ? <OverviewPage /> : <LocationsPage />
}
