import React, { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { PaperProvider, useTheme } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { buildTheme } from '@/theme';
import { useAuthStore } from '@/stores/authStore';
import { useInstanceStore } from '@/stores/instanceStore';
import { useUiStore, hydrateUiStore } from '@/stores/uiStore';
import { hydrateNotificationPreference } from '@/stores/notificationStore';
import { configureAuth } from '@/api/client';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useSocketConnection } from '@/hooks/useSocket';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
    },
  },
});

// Wire up the auth store to the API client
configureAuth({
  getAccessToken: () => useAuthStore.getState().accessToken,
  getRefreshToken: () => useAuthStore.getState().refreshToken,
  setTokens: (access, refresh) => useAuthStore.getState().setTokens(access, refresh),
  clearAuth: () => useAuthStore.getState().clearAuth(),
});

function AppContent() {
  const theme = useTheme();
  const instanceIsHydrated = useInstanceStore((s) => s.isHydrated);
  const activeInstance = useInstanceStore((s) => s.activeInstance);
  const hydrateInstance = useInstanceStore((s) => s.hydrate);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const emailVerified = useAuthStore((s) => s.emailVerified);
  const hydrate = useAuthStore((s) => s.hydrate);

  const router = useRouter();
  const segments = useSegments();

  useSocketConnection();

  useEffect(() => {
    void hydrateInstance().then(() => void hydrate());
    void hydrateUiStore();
    void hydrateNotificationPreference();
  }, [hydrateInstance, hydrate]);

  useEffect(() => {
    if (!instanceIsHydrated) return;
    const segs = segments as string[];
    const inConnectScreen = segs[0] === 'connect';

    if (!activeInstance) {
      if (!inConnectScreen) router.replace('/connect');
      return;
    }

    if (!isHydrated) return;
    const inAuthGroup = segs[0] === '(auth)';
    const inVerifyScreen = segs[1] === 'verify-email';

    if (isAuthenticated && emailVerified && (inAuthGroup || inConnectScreen)) {
      router.replace('/(main)/servers');
    } else if (isAuthenticated && !emailVerified && !inVerifyScreen) {
      router.replace('/(auth)/verify-email');
    } else if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    }
  }, [activeInstance, instanceIsHydrated, isAuthenticated, emailVerified, isHydrated, segments, router]);

  if (!instanceIsHydrated) {
    return <LoadingSpinner message="Loading..." />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }}>
      <Stack.Screen name="+not-found" />
      <Stack.Screen name="connect" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(main)" />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const themePreference = useUiStore((s) => s.themePreference);
  const colorTheme = useUiStore((s) => s.colorTheme);

  const effectiveScheme =
    themePreference === 'system' ? colorScheme : themePreference;
  const mode = effectiveScheme === 'dark' ? 'dark' : 'light';
  const theme = buildTheme(colorTheme, mode);
  const rnTheme = effectiveScheme === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider value={rnTheme}>
            <PaperProvider theme={theme}>
              <ErrorBoundary>
                <AppContent />
              </ErrorBoundary>
            </PaperProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
