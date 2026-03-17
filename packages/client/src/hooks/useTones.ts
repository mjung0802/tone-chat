import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as tonesApi from '../api/tones.api';
import type { AddCustomToneRequest } from '../types/api.types';

export function useCustomTones(serverId: string) {
  return useQuery({
    queryKey: ['servers', serverId, 'customTones'],
    queryFn: () => tonesApi.getCustomTones(serverId),
    select: (data) => data.customTones,
    enabled: !!serverId,
  });
}

export function useAddCustomTone(serverId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AddCustomToneRequest) => tonesApi.addCustomTone(serverId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['servers', serverId, 'customTones'] });
    },
  });
}

export function useRemoveCustomTone(serverId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (toneKey: string) => tonesApi.removeCustomTone(serverId, toneKey),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['servers', serverId, 'customTones'] });
    },
  });
}
