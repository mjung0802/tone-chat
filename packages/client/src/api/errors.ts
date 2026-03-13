import { ApiClientError } from './client';

function isNetworkError(error: unknown): boolean {
  return (
    error instanceof TypeError &&
    /fetch|network|failed to fetch/i.test(error.message)
  );
}

/**
 * Maps a caught mutation error to a user-facing message for auth screens.
 * Returns an empty string when there is no error.
 */
export function getAuthErrorMessage(
  error: unknown,
  context: 'login' | 'register',
): string {
  if (!error) return '';

  if (isNetworkError(error)) {
    return 'Unable to connect. Please check your internet connection.';
  }

  if (error instanceof ApiClientError) {
    switch (error.status) {
    case 400:
      // Server messages are specific: "Password must be at least 8 characters", etc.
      return error.message || 'Please check the information you entered.';
    case 401:
      if (context === 'login') return 'Incorrect email or password.';
      return error.message || 'Authentication failed. Please try again.';
    case 409:
      if (context === 'register') return 'An account with that email or username already exists.';
      return error.message || 'A conflict occurred. Please try again.';
    case 429:
      return 'Too many attempts. Please wait a moment and try again.';
    case 500:
      return 'Something went wrong on our end. Please try again later.';
    default:
      return error.message || 'An unexpected error occurred. Please try again.';
    }
  }

  return 'An unexpected error occurred. Please try again.';
}
