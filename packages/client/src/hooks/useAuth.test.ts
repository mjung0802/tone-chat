import { renderHook, waitFor } from "@testing-library/react-native";
import * as authApi from "../api/auth.api";
import { useAuthStore } from "../stores/authStore";
import { useSocketStore } from "../stores/socketStore";
import {
  useLogin,
  useRegister,
  useLogout,
  useVerifyEmail,
  useResendVerification,
} from "./useAuth";
import {
  createHookWrapper,
  createTestQueryClient,
} from "../test-utils/renderWithProviders";
import { makeUser, VALID_JWT } from "../test-utils/fixtures";

jest.mock("../api/auth.api");

beforeEach(() => {
  jest.clearAllMocks();

  // Spy on store methods
  useAuthStore.setState({
    accessToken: null,
    refreshToken: null,
    userId: null,
    isAuthenticated: false,
    isHydrated: false,
    emailVerified: false,
  });
});

describe("useLogin", () => {
  it("onSuccess calls setTokens, connect, queryClient.clear", async () => {
    const setTokensSpy = jest.spyOn(useAuthStore.getState(), "setTokens");
    const connectSpy = jest.fn();
    useSocketStore.setState({ connect: connectSpy } as never);

    jest.mocked(authApi.login).mockResolvedValueOnce({
      user: makeUser(),
      accessToken: "at-1",
      refreshToken: "rt-1",
    });

    const queryClient = createTestQueryClient();
    const clearSpy = jest.spyOn(queryClient, "clear");

    const { result } = renderHook(() => useLogin(), {
      wrapper: createHookWrapper(queryClient),
    });

    result.current.mutate({ email: "a@b.com", password: "pass" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(setTokensSpy).toHaveBeenCalledWith("at-1", "rt-1", true);
    expect(connectSpy).toHaveBeenCalledWith("at-1");
    expect(clearSpy).toHaveBeenCalled();
  });
});

describe("useRegister", () => {
  it("onSuccess calls setTokens, connect, queryClient.clear", async () => {
    const setTokensSpy = jest.spyOn(useAuthStore.getState(), "setTokens");
    const connectSpy = jest.fn();
    useSocketStore.setState({ connect: connectSpy } as never);

    jest.mocked(authApi.register).mockResolvedValueOnce({
      user: makeUser(),
      accessToken: "at-2",
      refreshToken: "rt-2",
    });

    const queryClient = createTestQueryClient();
    const clearSpy = jest.spyOn(queryClient, "clear");

    const { result } = renderHook(() => useRegister(), {
      wrapper: createHookWrapper(queryClient),
    });

    result.current.mutate({
      username: "user",
      email: "a@b.com",
      password: "pass",
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(setTokensSpy).toHaveBeenCalledWith("at-2", "rt-2", true);
    expect(connectSpy).toHaveBeenCalledWith("at-2");
    expect(clearSpy).toHaveBeenCalled();
  });
});

describe("useLogout", () => {
  it("calls disconnect, clearAuth, queryClient.clear", () => {
    const clearAuthSpy = jest.spyOn(useAuthStore.getState(), "clearAuth");
    const disconnectSpy = jest.fn();
    useSocketStore.setState({ disconnect: disconnectSpy } as never);

    const queryClient = createTestQueryClient();
    const clearSpy = jest.spyOn(queryClient, "clear");

    const { result } = renderHook(() => useLogout(), {
      wrapper: createHookWrapper(queryClient),
    });

    // useLogout returns a function (not a mutation)
    result.current();

    expect(disconnectSpy).toHaveBeenCalled();
    expect(clearAuthSpy).toHaveBeenCalled();
    expect(clearSpy).toHaveBeenCalled();
  });
});

describe("useLogin — email unverified", () => {
  it("calls setTokens with false and does NOT connect socket when email_verified=false", async () => {
    const setTokensSpy = jest.spyOn(useAuthStore.getState(), "setTokens");
    const connectSpy = jest.fn();
    useSocketStore.setState({ connect: connectSpy } as never);

    jest.mocked(authApi.login).mockResolvedValueOnce({
      user: makeUser({ email_verified: false }),
      accessToken: "at-1",
      refreshToken: "rt-1",
    });

    const { result } = renderHook(() => useLogin(), {
      wrapper: createHookWrapper(createTestQueryClient()),
    });

    result.current.mutate({ email: "a@b.com", password: "pass" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(setTokensSpy).toHaveBeenCalledWith("at-1", "rt-1", false);
    expect(connectSpy).not.toHaveBeenCalled();
  });
});

describe("useRegister — email unverified", () => {
  it("does NOT connect socket when email_verified=false", async () => {
    const connectSpy = jest.fn();
    useSocketStore.setState({ connect: connectSpy } as never);

    jest.mocked(authApi.register).mockResolvedValueOnce({
      user: makeUser({ email_verified: false }),
      accessToken: "at-2",
      refreshToken: "rt-2",
    });

    const { result } = renderHook(() => useRegister(), {
      wrapper: createHookWrapper(createTestQueryClient()),
    });

    result.current.mutate({
      username: "user",
      email: "a@b.com",
      password: "pass",
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(connectSpy).not.toHaveBeenCalled();
  });
});

describe("useVerifyEmail", () => {
  it("calls setEmailVerified(true) and connect on success", async () => {
    const setEmailVerifiedSpy = jest.spyOn(
      useAuthStore.getState(),
      "setEmailVerified",
    );
    const connectSpy = jest.fn();
    useSocketStore.setState({ connect: connectSpy } as never);
    useAuthStore.setState({ accessToken: VALID_JWT } as never);

    jest
      .mocked(authApi.verifyEmail)
      .mockResolvedValueOnce({ message: "Email verified" });

    const { result } = renderHook(() => useVerifyEmail(), {
      wrapper: createHookWrapper(createTestQueryClient()),
    });

    result.current.mutate({ code: "123456" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(setEmailVerifiedSpy).toHaveBeenCalledWith(true);
    expect(connectSpy).toHaveBeenCalledWith(VALID_JWT);
  });

  it("sets isError on failure", async () => {
    jest
      .mocked(authApi.verifyEmail)
      .mockRejectedValueOnce(new Error("INVALID_CODE"));

    const { result } = renderHook(() => useVerifyEmail(), {
      wrapper: createHookWrapper(createTestQueryClient()),
    });

    result.current.mutate({ code: "000000" });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe("useResendVerification", () => {
  it("sets isSuccess on success", async () => {
    jest
      .mocked(authApi.resendVerification)
      .mockResolvedValueOnce({ message: "Verification email sent" });

    const { result } = renderHook(() => useResendVerification(), {
      wrapper: createHookWrapper(createTestQueryClient()),
    });

    result.current.mutate();

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});
