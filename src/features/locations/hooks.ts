import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createMeter, createOwnLocation, getLocations } from './api'

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
