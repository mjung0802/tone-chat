import type { ApiError } from '../types/api.types';

const BASE_URL = 'http://localhost:4000/api/v1';

let getAccessToken: () => string | null = () => null;
let getRefreshToken: () => string | null = () => null;
let setTokens: (access: string, refresh: string) => void = () => {};
let clearAuth: () => void = () => {};

export function configureAuth(config: {
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  setTokens: (access: string, refresh: string) => void;
  clearAuth: () => void;
}) {
  getAccessToken = config.getAccessToken;
  getRefreshToken = config.getRefreshToken;
  setTokens = config.setTokens;
  clearAuth = config.clearAuth;
  isRefreshing = false;
  refreshPromise = null;
}

class ApiClientError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export { ApiClientError };

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function attemptRefresh(): Promise<boolean> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        clearAuth();
        return false;
      }

      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        clearAuth();
        return false;
      }

      const data = (await res.json()) as { accessToken: string; refreshToken: string };
      setTokens(data.accessToken, data.refreshToken);
      return true;
    } catch {
      clearAuth();
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  isRetry = false,
): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    ...Object.fromEntries(
      Object.entries(options.headers ?? {}).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    ),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!headers['Content-Type'] && !(options.body instanceof ArrayBuffer) && !(options.body instanceof Blob)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  if (res.status === 401 && !isRetry) {
    const refreshed = await attemptRefresh();
    if (refreshed) {
      return request<T>(path, options, true);
    }
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiError | null;
    throw new ApiClientError(
      body?.error?.code ?? 'UNKNOWN',
      body?.error?.message ?? res.statusText,
      res.status,
    );
  }

  return res.json() as Promise<T>;
}

export function get<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'GET' });
}

export function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    body: body != null ? JSON.stringify(body) : null,
  });
}

export function patch<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function put<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function del<T = void>(path: string): Promise<T> {
  return request<T>(path, { method: 'DELETE' });
}

export function uploadRaw<T>(
  path: string,
  data: ArrayBuffer | Blob,
  contentType: string,
): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body: data,
  });
}
