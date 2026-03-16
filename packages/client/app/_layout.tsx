import React, { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { PaperProvider, useTheme } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { lightTheme, darkTheme } from '@/theme';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore, hydrateTheme } from '@/stores/uiStore';
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
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const emailVerified = useAuthStore((s) => s.emailVerified);
  const hydrate = useAuthStore((s) => s.hydrate);

  const router = useRouter();
  const segments = useSegments();

  useSocketConnection();

  useEffect(() => {
    void hydrate();
    void hydrateTheme();
  }, [hydrate]);

  useEffect(() => {
    if (!isHydrated) return;
    const segs = segments as string[];
    const inAuthGroup = segs[0] === '(auth)';
    const inVerifyScreen = segs[1] === 'verify-email';

    if (isAuthenticated && emailVerified && inAuthGroup) {
      router.replace('/(main)/servers');
    } else if (isAuthenticated && !emailVerified && !inVerifyScreen) {
      router.replace('/(auth)/verify-email');
    } else if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, emailVerified, isHydrated, segments, router]);

  if (!isHydrated) {
    return <LoadingSpinner message="Loading..." />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }}>
      <Stack.Screen name="+not-found" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(main)" />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const themePreference = useUiStore((s) => s.themePreference);

  const effectiveScheme =
    themePreference === 'system' ? colorScheme : themePreference;
  const theme = effectiveScheme === 'dark' ? darkTheme : lightTheme;
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
