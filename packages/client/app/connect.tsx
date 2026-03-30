import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, HelperText, List, Divider, useTheme, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useInstanceStore } from '@/stores/instanceStore';
import { useAuthStore } from '@/stores/authStore';

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

export default function ConnectScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const instances = useInstanceStore((s) => s.instances);
  const addInstance = useInstanceStore((s) => s.addInstance);
  const setActiveInstance = useInstanceStore((s) => s.setActiveInstance);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const handleConnect = async () => {
    const normalized = normalizeUrl(url.trim());
    if (!normalized) return;
    setError(null);
    setIsChecking(true);
    try {
      const res = await fetch(`${normalized}/api/v1/health`, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error('Not a Tone server');
      const data = (await res.json()) as { ok?: boolean };
      if (!data.ok) throw new Error('Not a Tone server');
    } catch {
      setError('Could not connect to that server. Check the URL and try again.');
      setIsChecking(false);
      return;
    }
    setIsChecking(false);
    addInstance(normalized);
    router.replace('/(auth)/login');
  };

  const handleSwitchInstance = (instanceUrl: string) => {
    setActiveInstance(instanceUrl);
    if (isAuthenticated) {
      router.replace('/(main)/servers');
    } else {
      router.replace('/(auth)/login');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={{ backgroundColor: theme.colors.background }}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="headlineMedium" style={styles.title}>
          Connect to Tone
        </Text>
        <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          Enter the URL of a Tone Chat server
        </Text>

        {error ? (
          <HelperText
            type="error"
            visible
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
          >
            {error}
          </HelperText>
        ) : null}

        <TextInput
          label="Server URL"
          value={url}
          onChangeText={(v) => { setUrl(v); setError(null); }}
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="url"
          textContentType="URL"
          placeholder="https://chat.example.com"
          accessibilityLabel="Server URL"
          accessibilityHint="Enter the URL of your Tone Chat server"
          returnKeyType="go"
          onSubmitEditing={() => { void handleConnect(); }}
          style={styles.input}
        />

        <Button
          mode="contained"
          onPress={() => { void handleConnect(); }}
          disabled={!url.trim() || isChecking}
          accessibilityLabel="Connect to server"
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          {isChecking ? <ActivityIndicator size="small" color={theme.colors.onPrimary} /> : 'Connect'}
        </Button>

        {instances.length > 0 ? (
          <View style={styles.savedSection}>
            <Divider style={styles.divider} />
            <Text variant="titleSmall" style={[styles.savedTitle, { color: theme.colors.onSurfaceVariant }]}>
              Saved Servers
            </Text>
            {instances.map((instance) => (
              <List.Item
                key={instance}
                title={instance}
                left={(props) => <List.Icon {...props} icon="server" />}
                onPress={() => handleSwitchInstance(instance)}
                accessibilityLabel={`Connect to ${instance}`}
                accessibilityRole="button"
                style={styles.instanceRow}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    marginBottom: 12,
  },
  button: {
    marginTop: 8,
  },
  buttonContent: {
    paddingVertical: 6,
  },
  savedSection: {
    marginTop: 32,
  },
  divider: {
    marginBottom: 16,
  },
  savedTitle: {
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  instanceRow: {
    borderRadius: 8,
  },
});
