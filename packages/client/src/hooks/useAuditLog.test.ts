import { renderHook } from '@testing-library/react-native';
import * as auditLogApi from '../api/auditLog.api';
import { useAuditLog } from './useAuditLog';
import { createHookWrapper } from '../test-utils/renderWithProviders';
import { useAuthStore } from '../stores/authStore';

jest.mock('../api/auditLog.api');

const SERVER_ID = 'server-1';

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({
    accessToken: null,
    refreshToken: null,
    userId: null,
    isAuthenticated: false,
    isHydrated: false,
    emailVerified: false,
  });
});

describe('useAuditLog', () => {
  it('stays idle when isHydrated is false', () => {
    useAuthStore.setState({ isHydrated: false, isAuthenticated: false });

    const { result } = renderHook(() => useAuditLog(SERVER_ID), { wrapper: createHookWrapper() });

    expect(auditLogApi.getAuditLog).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('stays idle when isAuthenticated is false', () => {
    useAuthStore.setState({ isHydrated: true, isAuthenticated: false });

    const { result } = renderHook(() => useAuditLog(SERVER_ID), { wrapper: createHookWrapper() });

    expect(auditLogApi.getAuditLog).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });
});
