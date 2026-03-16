import { get, patch } from "./client";
import type { UserResponse, UpdateUserRequest } from "../types/api.types";

export function getMe() {
  return get<UserResponse>("/users/me");
}

export function updateMe(data: UpdateUserRequest) {
  return patch<UserResponse>("/users/me", data);
}

export function getUser(id: string) {
  return get<UserResponse>(`/users/${id}`);
}
