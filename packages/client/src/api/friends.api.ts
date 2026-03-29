import { get, post, patch, del } from './client';
import type {
  FriendsResponse,
  PendingRequestsResponse,
  FriendshipStatusResponse,
  FriendRequestResponse,
} from '../types/api.types';

export function getFriends() {
  return get<FriendsResponse>('/users/me/friends');
}

export function getPendingRequests() {
  return get<PendingRequestsResponse>('/users/me/friends/pending');
}

export function getFriendshipStatus(userId: string) {
  return get<FriendshipStatusResponse>(`/users/me/friends/${userId}/status`);
}

export function sendFriendRequest(userId: string) {
  return post<FriendRequestResponse>(`/users/me/friends/${userId}`, {});
}

export function acceptFriendRequest(userId: string) {
  return patch<Record<string, never>>(`/users/me/friends/${userId}/accept`, {});
}

export function removeFriend(userId: string) {
  return del<Record<string, never>>(`/users/me/friends/${userId}`);
}
