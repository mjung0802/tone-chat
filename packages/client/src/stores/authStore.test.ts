import { useAuthStore } from "./authStore";
import { VALID_JWT, EXPIRED_JWT, MALFORMED_JWT } from "../test-utils/fixtures";
import { getMe } from "../api/users.api";
import type { UserResponse } from "../types/api.types";

jest.mock("../api/users.api");
const mockGetMe = jest.mocked(getMe);

const STUB_USER_RESPONSE: UserResponse = {
  user: {
    id: "user-123",
    username: "test",
    email: "test@test.com",
    email_verified: true,
    display_name: null,
    pronouns: null,
    avatar_url: null,
    status: "online",
    bio: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
};

// With Platform.OS='web' (set in jest.setup.ts), authStore uses localStorage

beforeEach(() => {
  useAuthStore.setState({
    accessToken: null,
    refreshToken: null,
    userId: null,
    isAuthenticated: false,
    isHydrated: false,
    emailVerified: false,
  });
  localStorage.clear();
  jest.clearAllMocks();
  mockGetMe.mockReset();
});

describe("authStore", () => {
  describe("setTokens", () => {
    it("sets accessToken, refreshToken, userId, isAuthenticated", () => {
      useAuthStore.getState().setTokens(VALID_JWT, "refresh-abc");

      const state = useAuthStore.getState();
      expect(state.accessToken).toBe(VALID_JWT);
      expect(state.refreshToken).toBe("refresh-abc");
      expect(state.userId).toBe("user-123");
      expect(state.isAuthenticated).toBe(true);
    });

    it("with invalid JWT: isAuthenticated=true, userId=null", () => {
      useAuthStore.getState().setTokens(MALFORMED_JWT, "refresh-abc");

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.userId).toBeNull();
    });

    it("persists tokens to localStorage", () => {
      useAuthStore.getState().setTokens(VALID_JWT, "refresh-abc");

      expect(localStorage.getItem("accessToken")).toBe(VALID_JWT);
      expect(localStorage.getItem("refreshToken")).toBe("refresh-abc");
    });
  });

  describe("clearAuth", () => {
    it("resets all fields to null/false", () => {
      useAuthStore.getState().setTokens(VALID_JWT, "refresh-abc");
      useAuthStore.getState().clearAuth();

      const state = useAuthStore.getState();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.userId).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it("removes tokens from localStorage", () => {
      localStorage.setItem("accessToken", "old-at");
      localStorage.setItem("refreshToken", "old-rt");

      useAuthStore.getState().clearAuth();

      expect(localStorage.getItem("accessToken")).toBeNull();
      expect(localStorage.getItem("refreshToken")).toBeNull();
    });
  });

  describe("hydrate", () => {
    it("no tokens → only isHydrated", async () => {
      await useAuthStore.getState().hydrate();

      const state = useAuthStore.getState();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isHydrated).toBe(true);
    });

    it("apiGet not called when no tokens", async () => {
      await useAuthStore.getState().hydrate();

      expect(mockGetMe).not.toHaveBeenCalled();
    });

    it("valid token + server validates → authenticated", async () => {
      localStorage.setItem("accessToken", VALID_JWT);
      localStorage.setItem("refreshToken", "refresh-token");
      mockGetMe.mockResolvedValueOnce(STUB_USER_RESPONSE);

      await useAuthStore.getState().hydrate();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.isHydrated).toBe(true);
      expect(state.userId).toBe("user-123");
    });

    it("valid token + server rejects → not authenticated", async () => {
      localStorage.setItem("accessToken", VALID_JWT);
      localStorage.setItem("refreshToken", "refresh-token");
      mockGetMe.mockRejectedValueOnce(new Error("Unauthorized"));

      await useAuthStore.getState().hydrate();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isHydrated).toBe(true);
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
    });

    it("expired access + refresh token + server validates → authenticated", async () => {
      localStorage.setItem("accessToken", EXPIRED_JWT);
      localStorage.setItem("refreshToken", "refresh-token");
      mockGetMe.mockResolvedValueOnce(STUB_USER_RESPONSE);

      await useAuthStore.getState().hydrate();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.isHydrated).toBe(true);
    });

    it("expired access + refresh token + server rejects → not authenticated", async () => {
      localStorage.setItem("accessToken", EXPIRED_JWT);
      localStorage.setItem("refreshToken", "refresh-token");
      mockGetMe.mockRejectedValueOnce(new Error("Unauthorized"));

      await useAuthStore.getState().hydrate();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isHydrated).toBe(true);
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
    });

    it("valid token + network error → not authenticated", async () => {
      localStorage.setItem("accessToken", VALID_JWT);
      localStorage.setItem("refreshToken", "refresh-token");
      mockGetMe.mockRejectedValueOnce(new TypeError("Failed to fetch"));

      await useAuthStore.getState().hydrate();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isHydrated).toBe(true);
      expect(state.accessToken).toBeNull();
    });

    it("server validates → emailVerified preserved", async () => {
      localStorage.setItem("accessToken", VALID_JWT);
      localStorage.setItem("refreshToken", "refresh-token");
      localStorage.setItem("emailVerified", "true");
      mockGetMe.mockResolvedValueOnce(STUB_USER_RESPONSE);

      await useAuthStore.getState().hydrate();

      const state = useAuthStore.getState();
      expect(state.emailVerified).toBe(true);
      expect(state.isAuthenticated).toBe(true);
    });
  });

  describe("setTokens with emailVerified", () => {
    it("sets emailVerified=true when third arg is true", () => {
      useAuthStore.getState().setTokens(VALID_JWT, "rt", true);

      expect(useAuthStore.getState().emailVerified).toBe(true);
      expect(localStorage.getItem("emailVerified")).toBe("true");
    });

    it("sets emailVerified=false when third arg is false", () => {
      useAuthStore.getState().setTokens(VALID_JWT, "rt", false);

      expect(useAuthStore.getState().emailVerified).toBe(false);
      expect(localStorage.getItem("emailVerified")).toBe("false");
    });

    it("preserves existing emailVerified when third arg is omitted", () => {
      useAuthStore.setState({ emailVerified: true });

      useAuthStore.getState().setTokens(VALID_JWT, "rt");

      expect(useAuthStore.getState().emailVerified).toBe(true);
    });
  });

  describe("setEmailVerified", () => {
    it("sets emailVerified=true in state and localStorage", () => {
      useAuthStore.getState().setEmailVerified(true);

      expect(useAuthStore.getState().emailVerified).toBe(true);
      expect(localStorage.getItem("emailVerified")).toBe("true");
    });

    it("sets emailVerified=false in state and localStorage", () => {
      useAuthStore.setState({ emailVerified: true });

      useAuthStore.getState().setEmailVerified(false);

      expect(useAuthStore.getState().emailVerified).toBe(false);
      expect(localStorage.getItem("emailVerified")).toBe("false");
    });
  });

  describe("clearAuth resets emailVerified", () => {
    it("resets emailVerified to false and persists", () => {
      useAuthStore.getState().setTokens(VALID_JWT, "rt", true);

      useAuthStore.getState().clearAuth();

      expect(useAuthStore.getState().emailVerified).toBe(false);
      expect(localStorage.getItem("emailVerified")).toBe("false");
    });
  });
});
