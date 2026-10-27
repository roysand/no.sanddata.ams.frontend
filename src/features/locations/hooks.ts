import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createMeter,
  createOwnLocation,
  getLocations,
  updateMeterComment,
  updateOwnLocation,
} from './api'

export function useLocations() {
  return useQuery({ queryKey: ['locations'], queryFn: getLocations })
}

export function useCreateOwnLocation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createOwnLocation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['locations'] }),
  })
}

export function useCreateMeter() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createMeter,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['locations'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
      ]),
  })
}

function useRefreshLocations() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['locations'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'locations'] }),
    ])
}

export function useUpdateOwnLocation() {
  const refresh = useRefreshLocations()
  return useMutation({
    mutationFn: (v: { id: string; name: string; address: string; isActive: boolean }) =>
      updateOwnLocation(v.id, { name: v.name, address: v.address, isActive: v.isActive }),
    onSuccess: refresh,
  })
}

export function useUpdateMeterComment() {
  const refresh = useRefreshLocations()
  return useMutation({
    mutationFn: (v: { id: string; comment: string | null }) => updateMeterComment(v.id, v.comment),
    onSuccess: refresh,
  })
}
