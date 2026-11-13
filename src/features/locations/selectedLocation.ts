import { useCallback, useSyncExternalStore } from 'react'
import { useLocations } from './hooks'
import type { LocationSummary } from './types'

const KEY = 'ams.selectedLocation'
const listeners = new Set<() => void>()

function read(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

function write(id: string) {
  try {
    localStorage.setItem(KEY, id)
  } catch {
    // Storage can be blocked; the choice then lasts only until the next load.
    memoryChoice = id
  }
  listeners.forEach((notify) => notify())
}

let memoryChoice: string | null = null

function subscribe(notify: () => void) {
  listeners.add(notify)
  window.addEventListener('storage', notify)
  return () => {
    listeners.delete(notify)
    window.removeEventListener('storage', notify)
  }
}

/**
 * The location the user is looking at, remembered per device. Owners also receive their inactive
 * locations; everything the dashboard shows is limited to the active ones.
 */
export function useSelectedLocation() {
  const query = useLocations()
  const stored = useSyncExternalStore(subscribe, () => read() ?? memoryChoice)
  const active: LocationSummary[] = (query.data ?? []).filter(
    (location) => location.isActive !== false,
  )
  // Fall back to the first location when nothing (or a location we no longer have access to) is remembered.
  const selected = active.find((location) => location.id === stored) ?? active[0] ?? null
  const select = useCallback((id: string) => write(id), [])

  return {
    ...query,
    all: query.data ?? [],
    active,
    selected,
    select,
    hasMultiple: active.length > 1,
  }
}
