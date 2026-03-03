import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button } from 'react-native-paper';

interface CreateInviteFormProps {
  onSubmit: (data: { maxUses?: number; expiresIn?: number }) => void;
  isLoading?: boolean | undefined;
}

export function CreateInviteForm({ onSubmit, isLoading }: CreateInviteFormProps) {
  const [maxUses, setMaxUses] = useState('');
  const [expiresInHours, setExpiresInHours] = useState('');

  const handleSubmit = () => {
    const data: { maxUses?: number; expiresIn?: number } = {};
    const parsedMaxUses = parseInt(maxUses, 10);
    if (!isNaN(parsedMaxUses) && parsedMaxUses > 0) {
      data.maxUses = parsedMaxUses;
    }
    const parsedHours = parseInt(expiresInHours, 10);
    if (!isNaN(parsedHours) && parsedHours > 0) {
      data.expiresIn = parsedHours * 3600;
    }
    onSubmit(data);
    setMaxUses('');
    setExpiresInHours('');
  };

  return (
    <View style={styles.container}>
      <TextInput
        label="Max uses (optional)"
        value={maxUses}
        onChangeText={setMaxUses}
        keyboardType="numeric"
        accessibilityLabel="Maximum number of uses"
        style={styles.input}
      />
      <TextInput
        label="Expires in hours (optional)"
        value={expiresInHours}
        onChangeText={setExpiresInHours}
        keyboardType="numeric"
        accessibilityLabel="Expiration time in hours"
        style={styles.input}
      />
      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={isLoading ?? false}
        disabled={isLoading ?? false}
        accessibilityLabel="Create invite"
        style={styles.button}
      >
        Create Invite
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  input: {},
  button: {
    marginTop: 8,
  },
});
