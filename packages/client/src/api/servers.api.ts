import { get, post, patch, del } from "./client";
import type {
  ServerResponse,
  ServersResponse,
  CreateServerRequest,
  UpdateServerRequest,
} from "../types/api.types";

export function getServers() {
  return get<ServersResponse>("/servers");
}

export function getServer(serverId: string) {
  return get<ServerResponse>(`/servers/${serverId}`);
}

export function createServer(data: CreateServerRequest) {
  return post<ServerResponse>("/servers", data);
}

export function updateServer(serverId: string, data: UpdateServerRequest) {
  return patch<ServerResponse>(`/servers/${serverId}`, data);
}

export function deleteServer(serverId: string) {
  return del(`/servers/${serverId}`);
}
