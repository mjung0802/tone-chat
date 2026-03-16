import {
  ApiClientError,
  configureAuth,
  del,
  get,
  patch,
  post,
  put,
  uploadRaw,
} from "./client";

// ---------- helpers ----------

interface MockResponse {
  ok: boolean;
  status: number;
  statusText: string;
  json: () => Promise<unknown>;
}

function mockResponse(status: number, body?: unknown): MockResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : `Error ${status}`,
    json:
      body !== undefined
        ? () => Promise.resolve(body)
        : () => Promise.reject(new Error("no body")),
  };
}

// ---------- setup ----------

const mockFetch = jest.fn<Promise<MockResponse>, [string, RequestInit?]>();
global.fetch = mockFetch as jest.Mock;

beforeEach(() => {
  mockFetch.mockReset();
  // configureAuth() resets isRefreshing/refreshPromise and is called at the start of each test
});

// ---------- tests (non-refresh) ----------

describe("API client", () => {
  it("injects Authorization header when token exists", async () => {
    configureAuth({
      getAccessToken: () => "my-token",
      getRefreshToken: () => null,
      setTokens: jest.fn(),
      clearAuth: jest.fn(),
    });
    mockFetch.mockResolvedValueOnce(mockResponse(200, { ok: true }));

    await get("/test");

    const [, init] = mockFetch.mock.calls[0]!;
    expect((init?.headers as Record<string, string>)["Authorization"]).toBe(
      "Bearer my-token",
    );
  });

  it("omits auth header when token is null", async () => {
    configureAuth({
      getAccessToken: () => null,
      getRefreshToken: () => null,
      setTokens: jest.fn(),
      clearAuth: jest.fn(),
    });
    mockFetch.mockResolvedValueOnce(mockResponse(200, { ok: true }));

    await get("/test");

    const [, init] = mockFetch.mock.calls[0]!;
    expect(
      (init?.headers as Record<string, string>)["Authorization"],
    ).toBeUndefined();
  });

  it("post() sets Content-Type application/json and stringifies body", async () => {
    configureAuth({
      getAccessToken: () => null,
      getRefreshToken: () => null,
      setTokens: jest.fn(),
      clearAuth: jest.fn(),
    });
    mockFetch.mockResolvedValueOnce(mockResponse(200, { id: 1 }));

    await post("/items", { name: "thing" });

    const [, init] = mockFetch.mock.calls[0]!;
    expect((init?.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json",
    );
    expect(init?.body).toBe(JSON.stringify({ name: "thing" }));
  });

  it("patch() sends PATCH method with JSON body", async () => {
    configureAuth({
      getAccessToken: () => null,
      getRefreshToken: () => null,
      setTokens: jest.fn(),
      clearAuth: jest.fn(),
    });
    mockFetch.mockResolvedValueOnce(
      mockResponse(200, { id: 1, name: "updated" }),
    );

    const result = await patch("/items/1", { name: "updated" });

    const [url, init] = mockFetch.mock.calls[0]!;
    expect(url).toContain("/items/1");
    expect(init?.method).toBe("PATCH");
    expect((init?.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json",
    );
    expect(init?.body).toBe(JSON.stringify({ name: "updated" }));
    expect(result).toEqual({ id: 1, name: "updated" });
  });

  it("put() sends PUT method with JSON body", async () => {
    configureAuth({
      getAccessToken: () => null,
      getRefreshToken: () => null,
      setTokens: jest.fn(),
      clearAuth: jest.fn(),
    });
    mockFetch.mockResolvedValueOnce(
      mockResponse(200, { id: 1, status: "active" }),
    );

    const result = await put("/items/1", { status: "active" });

    const [url, init] = mockFetch.mock.calls[0]!;
    expect(url).toContain("/items/1");
    expect(init?.method).toBe("PUT");
    expect((init?.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json",
    );
    expect(init?.body).toBe(JSON.stringify({ status: "active" }));
    expect(result).toEqual({ id: 1, status: "active" });
  });

  it("get() does not include body", async () => {
    configureAuth({
      getAccessToken: () => null,
      getRefreshToken: () => null,
      setTokens: jest.fn(),
      clearAuth: jest.fn(),
    });
    mockFetch.mockResolvedValueOnce(mockResponse(200, { items: [] }));

    await get("/items");

    const [, init] = mockFetch.mock.calls[0]!;
    expect(init?.method).toBe("GET");
    expect(init?.body).toBeUndefined();
  });

  it("del() sends DELETE method", async () => {
    configureAuth({
      getAccessToken: () => null,
      getRefreshToken: () => null,
      setTokens: jest.fn(),
      clearAuth: jest.fn(),
    });
    mockFetch.mockResolvedValueOnce(mockResponse(204));

    await del("/items/1");

    const [, init] = mockFetch.mock.calls[0]!;
    expect(init?.method).toBe("DELETE");
  });

  it("post() with null body sends null", async () => {
    configureAuth({
      getAccessToken: () => null,
      getRefreshToken: () => null,
      setTokens: jest.fn(),
      clearAuth: jest.fn(),
    });
    mockFetch.mockResolvedValueOnce(mockResponse(200, { success: true }));

    await post("/action");

    const [, init] = mockFetch.mock.calls[0]!;
    expect(init?.body).toBeNull();
  });

  it("uploadRaw() uses provided contentType, not JSON", async () => {
    configureAuth({
      getAccessToken: () => null,
      getRefreshToken: () => null,
      setTokens: jest.fn(),
      clearAuth: jest.fn(),
    });
    mockFetch.mockResolvedValueOnce(mockResponse(200, { url: "https://..." }));

    const blob = new Blob(["data"], { type: "image/png" });
    await uploadRaw("/upload", blob, "image/png");

    const [, init] = mockFetch.mock.calls[0]!;
    expect((init?.headers as Record<string, string>)["Content-Type"]).toBe(
      "image/png",
    );
  });

  it("returns undefined for 204 without parsing JSON", async () => {
    configureAuth({
      getAccessToken: () => null,
      getRefreshToken: () => null,
      setTokens: jest.fn(),
      clearAuth: jest.fn(),
    });
    mockFetch.mockResolvedValueOnce(mockResponse(204));

    const result = await del("/items/1");

    expect(result).toBeUndefined();
  });

  it("throws ApiClientError with code/message/status on 4xx", async () => {
    configureAuth({
      getAccessToken: () => null,
      getRefreshToken: () => null,
      setTokens: jest.fn(),
      clearAuth: jest.fn(),
    });
    mockFetch.mockResolvedValueOnce(
      mockResponse(400, {
        error: { code: "BAD_REQUEST", message: "Invalid input", status: 400 },
      }),
    );

    const err = (await get("/bad").catch((e: unknown) => e)) as InstanceType<
      typeof ApiClientError
    >;
    expect(err).toBeInstanceOf(ApiClientError);
    expect(err.code).toBe("BAD_REQUEST");
    expect(err.message).toBe("Invalid input");
    expect(err.status).toBe(400);
  });

  it("throws with code=UNKNOWN when body is not JSON", async () => {
    configureAuth({
      getAccessToken: () => null,
      getRefreshToken: () => null,
      setTokens: jest.fn(),
      clearAuth: jest.fn(),
    });
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: () => Promise.reject(new Error("not json")),
    });

    const err = (await get("/err").catch((e: unknown) => e)) as {
      code: string;
      status: number;
    };
    expect(err.code).toBe("UNKNOWN");
    expect(err.status).toBe(500);
  });

  // ---------- 401 / refresh ----------

  it("on 401: calls refresh, retries original request", async () => {
    configureAuth({
      getAccessToken: () => "expired-token",
      getRefreshToken: () => "refresh-token",
      setTokens: jest.fn(),
      clearAuth: jest.fn(),
    });

    mockFetch
      .mockResolvedValueOnce(mockResponse(401)) // original
      .mockResolvedValueOnce(
        mockResponse(200, { accessToken: "new-at", refreshToken: "new-rt" }),
      ) // refresh
      .mockResolvedValueOnce(mockResponse(200, { data: "success" })); // retry

    const result = await get<{ data: string }>("/protected");

    expect(result.data).toBe("success");
    expect(mockFetch).toHaveBeenCalledTimes(3);
    const [refreshUrl] = mockFetch.mock.calls[1]!;
    expect(refreshUrl).toContain("/auth/refresh");
  });

  it("on 401: calls setTokens after successful refresh", async () => {
    const mockSetTokens = jest.fn();
    configureAuth({
      getAccessToken: () => "expired-token",
      getRefreshToken: () => "refresh-token",
      setTokens: mockSetTokens,
      clearAuth: jest.fn(),
    });

    mockFetch
      .mockResolvedValueOnce(mockResponse(401))
      .mockResolvedValueOnce(
        mockResponse(200, { accessToken: "new-at", refreshToken: "new-rt" }),
      )
      .mockResolvedValueOnce(mockResponse(200, { ok: true }));

    await get("/protected");

    expect(mockSetTokens).toHaveBeenCalledWith("new-at", "new-rt");
  });

  it("on 401 with no refresh token: calls clearAuth, no retry", async () => {
    const mockClearAuth = jest.fn();
    configureAuth({
      getAccessToken: () => "expired-token",
      getRefreshToken: () => null,
      setTokens: jest.fn(),
      clearAuth: mockClearAuth,
    });

    mockFetch.mockResolvedValueOnce(
      mockResponse(401, {
        error: { code: "UNAUTHORIZED", message: "bad", status: 401 },
      }),
    );

    await expect(get("/protected")).rejects.toThrow(ApiClientError);
    expect(mockClearAuth).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("on 401 when refresh fails (non-OK): calls clearAuth", async () => {
    const mockClearAuth = jest.fn();
    configureAuth({
      getAccessToken: () => "expired-token",
      getRefreshToken: () => "refresh-token",
      setTokens: jest.fn(),
      clearAuth: mockClearAuth,
    });

    mockFetch
      .mockResolvedValueOnce(
        mockResponse(401, {
          error: { code: "UNAUTHORIZED", message: "bad", status: 401 },
        }),
      )
      .mockResolvedValueOnce(
        mockResponse(403, {
          error: { code: "FORBIDDEN", message: "revoked", status: 403 },
        }),
      );

    await expect(get("/protected")).rejects.toThrow(ApiClientError);
    expect(mockClearAuth).toHaveBeenCalled();
  });

  it("on 401 when refresh throws (network): calls clearAuth", async () => {
    const mockClearAuth = jest.fn();
    configureAuth({
      getAccessToken: () => "expired-token",
      getRefreshToken: () => "refresh-token",
      setTokens: jest.fn(),
      clearAuth: mockClearAuth,
    });

    mockFetch
      .mockResolvedValueOnce(
        mockResponse(401, {
          error: { code: "UNAUTHORIZED", message: "bad", status: 401 },
        }),
      )
      .mockRejectedValueOnce(new TypeError("Network error"));

    await expect(get("/protected")).rejects.toThrow(ApiClientError);
    expect(mockClearAuth).toHaveBeenCalled();
  });

  it("retry request (isRetry=true) does NOT re-trigger refresh", async () => {
    configureAuth({
      getAccessToken: () => "expired-token",
      getRefreshToken: () => "refresh-token",
      setTokens: jest.fn(),
      clearAuth: jest.fn(),
    });

    mockFetch
      .mockResolvedValueOnce(
        mockResponse(401, {
          error: { code: "UNAUTHORIZED", message: "no", status: 401 },
        }),
      )
      .mockResolvedValueOnce(
        mockResponse(200, { accessToken: "new-at", refreshToken: "new-rt" }),
      )
      .mockResolvedValueOnce(
        mockResponse(401, {
          error: { code: "UNAUTHORIZED", message: "still bad", status: 401 },
        }),
      );

    await expect(get("/protected")).rejects.toThrow(ApiClientError);

    const refreshCalls = mockFetch.mock.calls.filter(([url]) =>
      String(url).includes("/auth/refresh"),
    );
    expect(refreshCalls).toHaveLength(1);
  });

  it("two simultaneous 401s produce exactly one /auth/refresh call", async () => {
    configureAuth({
      getAccessToken: () => "expired-token",
      getRefreshToken: () => "refresh-token",
      setTokens: jest.fn(),
      clearAuth: jest.fn(),
    });

    mockFetch
      .mockResolvedValueOnce(mockResponse(401)) // get('/a') initial
      .mockResolvedValueOnce(mockResponse(401)) // get('/b') initial
      .mockResolvedValueOnce(
        mockResponse(200, { accessToken: "new-at", refreshToken: "new-rt" }),
      ) // single refresh
      .mockResolvedValueOnce(mockResponse(200, { d: 1 })) // get('/a') retry
      .mockResolvedValueOnce(mockResponse(200, { d: 2 })); // get('/b') retry

    const [r1, r2] = await Promise.all([get("/a"), get("/b")]);

    expect(r1).toEqual({ d: 1 });
    expect(r2).toEqual({ d: 2 });

    const refreshCalls = mockFetch.mock.calls.filter(([url]) =>
      String(url).includes("/auth/refresh"),
    );
    expect(refreshCalls).toHaveLength(1);
  });
});
