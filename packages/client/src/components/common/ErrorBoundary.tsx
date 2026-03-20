import React, { Component, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container} accessibilityRole="alert">
          <Text variant="headlineSmall" style={styles.title}>
            Something went wrong
          </Text>
          <Text variant="bodyMedium" style={styles.message}>
            {this.state.error?.message ?? 'An unexpected error occurred'}
          </Text>
          <Button
            mode="contained"
            onPress={this.handleRetry}
            style={styles.button}
            accessibilityLabel="Try again"
            accessibilityHint="Reloads this section of the app"
          >
            Try Again
          </Button>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    marginBottom: 8,
  },
  message: {
    marginBottom: 24,
    textAlign: 'center',
    opacity: 0.7,
  },
  button: {
    minWidth: 120,
  },
});
