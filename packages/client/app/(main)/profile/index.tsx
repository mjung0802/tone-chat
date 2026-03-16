import React, { useState, useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Icon, TextInput, Button, Text, HelperText, Snackbar, Portal, useTheme } from 'react-native-paper';
import type { AppTheme } from '@/theme';
import { useMe, useUpdateProfile } from '@/hooks/useUser';
import { useLogout } from '@/hooks/useAuth';
import { useUpload } from '@/hooks/useAttachments';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { UserAvatar } from '@/components/common/UserAvatar';
import { ApiClientError } from '@/api/client';
import * as DocumentPicker from 'expo-document-picker';

export default function ProfileScreen() {
  const { data: user, isLoading } = useMe();
  const updateProfile = useUpdateProfile();
  const upload = useUpload();
  const logout = useLogout();
  const theme = useTheme<AppTheme>();
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

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
    updateProfile.mutate(data, { onSuccess: () => setShowSuccess(true) });
  };

  const displayLabel = user.display_name ?? user.username;

  const handleAvatarPress = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['image/*'] });
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0]!;
    setIsUploadingAvatar(true);
    setAvatarError('');
    try {
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const uploadResult = await upload.mutateAsync({
        data: blob,
        filename: asset.name,
        contentType: asset.mimeType ?? 'image/jpeg',
      });
      updateProfile.mutate({ avatar_url: uploadResult.attachment.id });
    } catch {
      setAvatarError('Failed to upload avatar');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  return (
    <>
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable
        onPress={handleAvatarPress}
        style={styles.avatarContainer}
        accessibilityRole="button"
        accessibilityLabel="Change profile picture"
      >
        <UserAvatar
          avatarAttachmentId={user.avatar_url}
          name={displayLabel}
          size={80}
        />
        <View style={[styles.cameraOverlay, { backgroundColor: theme.colors.surface }]}>
          {isUploadingAvatar ? (
            <ActivityIndicator size={16} />
          ) : (
            <Icon source="camera" size={16} color={theme.colors.onSurface} />
          )}
        </View>
      </Pressable>

      <Text variant="headlineSmall" style={styles.username}>
        {user.username}
      </Text>
      <Text variant="bodySmall" style={[styles.email, { color: theme.colors.onSurfaceVariant }]}>
        {user.email}
      </Text>

      {errorMessage || avatarError ? (
        <HelperText type="error" visible accessibilityLiveRegion="polite">
          {errorMessage || avatarError}
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
    <Portal>
      <Snackbar
        visible={showSuccess}
        onDismiss={() => setShowSuccess(false)}
        duration={5000}
        icon="close"
        onIconPress={() => setShowSuccess(false)}
        iconAccessibilityLabel="Dismiss notification"
        style={{ backgroundColor: theme.colors.success }}
        wrapperStyle={styles.snackbarWrapper}
      >
        <View style={styles.snackbarContent}>
          <Icon source="check-circle" size={20} color={theme.colors.onSuccess} />
          <Text style={{ color: theme.colors.onSuccess }}>Profile updated successfully</Text>
        </View>
      </Snackbar>
    </Portal>
    </>
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
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
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
  snackbarWrapper: {
    top: 0,
    bottom: undefined,
    alignItems: 'flex-end' as const,
  },
  snackbarContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
});
