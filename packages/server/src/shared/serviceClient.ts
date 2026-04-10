import { config } from '../config/index.js';

export interface ServiceResponse {
  status: number;
  data: unknown;
}

export async function serviceRequest(
  baseUrl: string,
  path: string,
  options: {
    method?: string;
    body?: unknown;
    userToken?: string;
    headers?: Record<string, string>;
  } = {},
): Promise<ServiceResponse> {
  const { method = 'GET', body, userToken } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Internal-Key': config.internalApiKey,
    ...options.headers,
  };

  if (userToken) {
    headers['X-User-Token'] = userToken;
  }

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  if (res.status === 204) {
    return { status: 204, data: null };
  }

  const data: unknown = await res.json();
  return { status: res.status, data };
}
