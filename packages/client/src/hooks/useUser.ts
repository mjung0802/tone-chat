import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as usersApi from '../api/users.api';
import { useAuthStore } from '../stores/authStore';
import type { UpdateUserRequest } from '../types/api.types';

export function useMe() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['me'],
    queryFn: () => usersApi.getMe(),
    select: (data) => data.user,
    enabled: isAuthenticated,
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => usersApi.getUser(id),
    select: (data) => data.user,
    enabled: !!id,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateUserRequest) => usersApi.updateMe(data),
    onSuccess: (response) => {
      queryClient.setQueryData(['me'], response);
    },
  });
}
