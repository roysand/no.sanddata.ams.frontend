import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { LocationSummary } from './types'

interface LocationPickerProps {
  locations: LocationSummary[]
  value: string
  onChange: (locationId: string) => void
}

export function LocationPicker({ locations, value, onChange }: LocationPickerProps) {
  if (locations.length === 1) return null

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-56 bg-white" aria-label="Location">
        <SelectValue placeholder="Choose a location" />
      </SelectTrigger>
      <SelectContent>
        {locations.map((location) => (
          <SelectItem key={location.id} value={location.id}>
            {location.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
