import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, HelperText, useTheme } from 'react-native-paper';
import { Link } from 'expo-router';
import { useRegister, useSwitchInstance } from '../../src/hooks/useAuth';
import { getAuthErrorMessage } from '../../src/api/errors';

export default function RegisterScreen() {
  const theme = useTheme();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const registerMutation = useRegister();
  const switchInstance = useSwitchInstance();

  const errorMessage = getAuthErrorMessage(registerMutation.error, 'register');

  const handleRegister = () => {
    if (!username.trim() || !email.trim() || !password) return;
    registerMutation.mutate({
      username: username.trim(),
      email: email.trim(),
      password,
    });
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
          Create Account
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Join Tone Chat to start messaging
        </Text>

        {errorMessage ? (
          <HelperText
            type="error"
            visible
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
          >
            {errorMessage}
          </HelperText>
        ) : null}

        <TextInput
          label="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoComplete="username-new"
          maxLength={32}
          accessibilityLabel="Username"
          accessibilityHint="Choose a unique username, max 32 characters"
          style={styles.input}
        />

        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          accessibilityLabel="Email address"
          accessibilityHint="Enter your email address"
          style={styles.input}
        />

        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          autoComplete="password-new"
          textContentType="newPassword"
          accessibilityLabel="Password"
          accessibilityHint="Choose a strong password"
          right={
            <TextInput.Icon
              icon={showPassword ? 'eye-off' : 'eye'}
              onPress={() => setShowPassword(!showPassword)}
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            />
          }
          style={styles.input}
        />

        <Button
          mode="contained"
          onPress={handleRegister}
          disabled={
            !username.trim() || !email.trim() || !password || registerMutation.isPending
          }
          loading={registerMutation.isPending}
          accessibilityLabel="Create account"
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Create Account
        </Button>

        <View style={styles.footer}>
          <Text variant="bodyMedium">Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <Button
              mode="text"
              compact
              accessibilityLabel="Sign in"
              accessibilityHint="Navigate to the sign in screen"
            >
              Sign In
            </Button>
          </Link>
        </View>

        <Button
          mode="text"
          icon="swap-horizontal"
          onPress={switchInstance}
          accessibilityLabel="Switch to a different Tone server"
          style={styles.switchInstance}
        >
          Switch to a different Tone server
        </Button>
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
    opacity: 0.7,
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  switchInstance: {
    marginTop: 8,
  },
});
