import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as friendsApi from '../api/friends.api';
import { useAuthStore } from '../stores/authStore';

export function useFriends() {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['friends'],
    queryFn: () => friendsApi.getFriends(),
    select: (data) => data.friends,
    enabled: isHydrated && isAuthenticated,
  });
}

export function usePendingRequests() {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['friends', 'pending'],
    queryFn: () => friendsApi.getPendingRequests(),
    select: (data) => data.requests,
    enabled: isHydrated && isAuthenticated,
  });
}

export function useFriendshipStatus(userId: string | null) {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['friends', 'status', userId],
    queryFn: () => friendsApi.getFriendshipStatus(userId!),
    select: (data) => data.status,
    enabled: !!userId && isHydrated && isAuthenticated,
  });
}

export function useSendFriendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => friendsApi.sendFriendRequest(userId),
    onSuccess: (_data, userId) => {
      void queryClient.invalidateQueries({ queryKey: ['friends', 'status', userId] });
      void queryClient.invalidateQueries({ queryKey: ['friends', 'pending'] });
      void queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
  });
}

export function useAcceptFriendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => friendsApi.acceptFriendRequest(userId),
    onSuccess: (_data, userId) => {
      void queryClient.invalidateQueries({ queryKey: ['friends'] });
      void queryClient.invalidateQueries({ queryKey: ['friends', 'pending'] });
      void queryClient.invalidateQueries({ queryKey: ['friends', 'status', userId] });
    },
  });
}

export function useRemoveFriend() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => friendsApi.removeFriend(userId),
    onSuccess: (_data, userId) => {
      void queryClient.invalidateQueries({ queryKey: ['friends'] });
      void queryClient.invalidateQueries({ queryKey: ['friends', 'pending'] });
      void queryClient.invalidateQueries({ queryKey: ['friends', 'status', userId] });
    },
  });
}
