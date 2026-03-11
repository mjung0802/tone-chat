import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, HelperText, useTheme } from 'react-native-paper';
import { useVerifyEmail, useResendVerification } from '../../src/hooks/useAuth';
import { useMe } from '../../src/hooks/useUser';
import { ApiClientError } from '../../src/api/client';

const RESEND_COOLDOWN_SECONDS = 60;

function getVerifyErrorMessage(error: unknown): string {
  if (!error) return '';
  if (error instanceof ApiClientError) {
    switch (error.code) {
      case 'INVALID_CODE': return 'Invalid verification code. Please check and try again.';
      case 'CODE_EXPIRED': return 'This code has expired. Please request a new one.';
      case 'TOO_MANY_REQUESTS': return 'Too many attempts. Please wait a moment and try again.';
      default: return error.message || 'An unexpected error occurred.';
    }
  }
  return 'An unexpected error occurred. Please try again.';
}

export default function VerifyEmailScreen() {
  const theme = useTheme();
  const [code, setCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: user } = useMe();
  const verifyMutation = useVerifyEmail();
  const resendMutation = useResendVerification();

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const startCooldown = () => {
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleVerify = () => {
    if (code.length < 6) return;
    verifyMutation.mutate({ code });
  };

  const handleResend = () => {
    if (resendCooldown > 0) return;
    resendMutation.mutate(undefined, {
      onSuccess: () => startCooldown(),
    });
  };

  const errorMessage = getVerifyErrorMessage(verifyMutation.error);

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
          Verify Your Email
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {user?.email
            ? `We sent a 6-digit code to ${user.email}`
            : 'We sent a 6-digit code to your email'}
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
          label="Verification Code"
          value={code}
          onChangeText={(text) => setCode(text.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          accessibilityLabel="6-digit verification code"
          accessibilityHint="Enter the 6-digit code sent to your email"
          style={styles.input}
        />

        <Button
          mode="contained"
          onPress={handleVerify}
          disabled={code.length < 6 || verifyMutation.isPending}
          loading={verifyMutation.isPending}
          accessibilityLabel="Verify email"
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Verify
        </Button>

        <View style={styles.resendRow}>
          <Text variant="bodyMedium">Didn't receive a code? </Text>
          <Button
            mode="text"
            compact
            onPress={handleResend}
            disabled={resendCooldown > 0 || resendMutation.isPending}
            loading={resendMutation.isPending}
            accessibilityLabel={
              resendCooldown > 0
                ? `Resend code available in ${resendCooldown} seconds`
                : 'Resend verification code'
            }
          >
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
          </Button>
        </View>
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
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
});
