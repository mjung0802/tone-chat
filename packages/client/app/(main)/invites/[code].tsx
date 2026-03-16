import React from "react";
import { View, StyleSheet } from "react-native";
import { Text, Button, Card, HelperText, useTheme } from "react-native-paper";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useJoinViaCode } from "../../../src/hooks/useInvites";
import { ApiClientError } from "../../../src/api/client";

export default function JoinInviteScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const joinMutation = useJoinViaCode();
  const theme = useTheme();

  const errorMessage =
    joinMutation.error instanceof ApiClientError
      ? joinMutation.error.message
      : joinMutation.error
        ? "Failed to join server"
        : "";

  const handleJoin = () => {
    if (!code) return;
    joinMutation.mutate(code, {
      onSuccess: (response) => {
        router.replace(`/(main)/servers/${response.server._id}`);
      },
    });
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineSmall" style={styles.title}>
            Join Server
          </Text>
          <Text variant="bodyMedium" style={styles.description}>
            You've been invited to join a server with code:
          </Text>
          <Text
            variant="titleLarge"
            style={[styles.code, { color: theme.colors.primary }]}
          >
            {code}
          </Text>

          {errorMessage ? (
            <HelperText type="error" visible accessibilityLiveRegion="polite">
              {errorMessage}
            </HelperText>
          ) : null}

          {joinMutation.isSuccess ? (
            <HelperText type="info" visible accessibilityLiveRegion="polite">
              Successfully joined! Redirecting...
            </HelperText>
          ) : null}
        </Card.Content>
        <Card.Actions style={styles.actions}>
          <Button onPress={() => router.back()} accessibilityLabel="Go back">
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={handleJoin}
            loading={joinMutation.isPending}
            disabled={joinMutation.isPending || !code}
            accessibilityLabel="Join server"
            accessibilityHint="Accepts the invitation and joins the server"
          >
            Join Server
          </Button>
        </Card.Actions>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    maxWidth: 400,
    width: "100%",
  },
  title: {
    textAlign: "center",
    marginBottom: 8,
  },
  description: {
    textAlign: "center",
    marginBottom: 12,
    opacity: 0.7,
  },
  code: {
    textAlign: "center",
    fontFamily: "monospace",
    marginBottom: 8,
  },
  actions: {
    justifyContent: "flex-end",
  },
});
