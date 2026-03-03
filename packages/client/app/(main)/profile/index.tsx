import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { TextInput, Button, Text, Avatar, HelperText, useTheme } from 'react-native-paper';
import { useMe, useUpdateProfile } from '../../../src/hooks/useUser';
import { useLogout } from '../../../src/hooks/useAuth';
import { LoadingSpinner } from '../../../src/components/common/LoadingSpinner';
import { ApiClientError } from '../../../src/api/client';

export default function ProfileScreen() {
  const { data: user, isLoading } = useMe();
  const updateProfile = useUpdateProfile();
  const logout = useLogout();
  const theme = useTheme();

  const [displayName, setDisplayName] = useState('');
  const [pronouns, setPronouns] = useState('');
  const [bio, setBio] = useState('');
  const [status, setStatus] = useState('');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (user && !initialized) {
      setDisplayName(user.display_name ?? '');
      setPronouns(user.pronouns ?? '');
      setBio(user.bio ?? '');
      setStatus(user.status ?? '');
      setInitialized(true);
    }
  }, [user, initialized]);

  if (isLoading || !user) {
    return <LoadingSpinner message="Loading profile..." />;
  }

  const errorMessage =
    updateProfile.error instanceof ApiClientError
      ? updateProfile.error.message
      : updateProfile.error
        ? 'Failed to update profile'
        : '';

  const handleSave = () => {
    const data: Record<string, string> = {};
    if (displayName.trim()) data['display_name'] = displayName.trim();
    if (pronouns.trim()) data['pronouns'] = pronouns.trim();
    if (bio.trim()) data['bio'] = bio.trim();
    if (status.trim()) data['status'] = status.trim();
    updateProfile.mutate(data);
  };

  const initials = (user.display_name ?? user.username).slice(0, 1).toUpperCase();

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Avatar.Text
        label={initials}
        size={80}
        style={[styles.avatar, { backgroundColor: theme.colors.primaryContainer }]}
        labelStyle={{ color: theme.colors.onPrimaryContainer }}
        accessibilityLabel={`Profile picture for ${user.username}`}
      />

      <Text variant="headlineSmall" style={styles.username}>
        {user.username}
      </Text>
      <Text variant="bodySmall" style={[styles.email, { color: theme.colors.onSurfaceVariant }]}>
        {user.email}
      </Text>

      {errorMessage ? (
        <HelperText type="error" visible accessibilityLiveRegion="polite">
          {errorMessage}
        </HelperText>
      ) : null}

      {updateProfile.isSuccess ? (
        <HelperText type="info" visible accessibilityLiveRegion="polite">
          Profile updated successfully
        </HelperText>
      ) : null}

      <TextInput
        label="Display Name"
        value={displayName}
        onChangeText={setDisplayName}
        maxLength={64}
        accessibilityLabel="Display name"
        style={styles.input}
      />

      <TextInput
        label="Pronouns"
        value={pronouns}
        onChangeText={setPronouns}
        accessibilityLabel="Pronouns"
        style={styles.input}
      />

      <TextInput
        label="Status"
        value={status}
        onChangeText={setStatus}
        maxLength={20}
        accessibilityLabel="Status"
        style={styles.input}
      />

      <TextInput
        label="Bio"
        value={bio}
        onChangeText={setBio}
        multiline
        numberOfLines={3}
        accessibilityLabel="Bio"
        style={styles.input}
      />

      <Button
        mode="contained"
        onPress={handleSave}
        loading={updateProfile.isPending}
        disabled={updateProfile.isPending}
        accessibilityLabel="Save profile changes"
        style={styles.button}
      >
        Save Changes
      </Button>

      <Button
        mode="outlined"
        onPress={logout}
        accessibilityLabel="Log out of your account"
        style={[styles.button, styles.logoutButton]}
        textColor={theme.colors.error}
      >
        Log Out
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    alignItems: 'center',
  },
  avatar: {
    marginBottom: 12,
  },
  username: {
    marginBottom: 2,
  },
  email: {
    marginBottom: 24,
  },
  input: {
    marginBottom: 12,
    width: '100%',
  },
  button: {
    marginTop: 8,
    width: '100%',
  },
  logoutButton: {
    marginTop: 24,
  },
});
