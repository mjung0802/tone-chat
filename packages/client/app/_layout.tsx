import React, { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { lightTheme, darkTheme } from '../src/theme';
import { useAuthStore } from '../src/stores/authStore';
import { useUiStore } from '../src/stores/uiStore';
import { configureAuth } from '../src/api/client';
import { ErrorBoundary } from '../src/components/common/ErrorBoundary';
import { LoadingSpinner } from '../src/components/common/LoadingSpinner';
import { useSocketConnection } from '../src/hooks/useSocket';

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
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hydrate = useAuthStore((s) => s.hydrate);

  useSocketConnection();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (!isHydrated) {
    return <LoadingSpinner message="Loading..." />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="+not-found" />
      {isAuthenticated ? (
        <Stack.Screen name="(main)" />
      ) : (
        <Stack.Screen name="(auth)" />
      )}
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const themePreference = useUiStore((s) => s.themePreference);

  const effectiveScheme =
    themePreference === 'system' ? colorScheme : themePreference;
  const theme = effectiveScheme === 'dark' ? darkTheme : lightTheme;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <PaperProvider theme={theme}>
            <ErrorBoundary>
              <AppContent />
            </ErrorBoundary>
          </PaperProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
