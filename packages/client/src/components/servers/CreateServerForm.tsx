import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, SegmentedButtons, HelperText } from 'react-native-paper';

interface CreateServerFormProps {
  onSubmit: (data: { name: string; description?: string | undefined; visibility: 'public' | 'private' }) => void;
  isLoading?: boolean | undefined;
}

export function CreateServerForm({ onSubmit, isLoading }: CreateServerFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('private');

  const nameError = name.length > 0 && name.trim().length === 0 ? 'Name cannot be blank' : '';

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      visibility,
    });
  };

  return (
    <View style={styles.container}>
      <TextInput
        label="Server Name"
        value={name}
        onChangeText={setName}
        error={!!nameError}
        maxLength={100}
        accessibilityLabel="Server name"
        accessibilityHint="Enter a name for your new server"
        style={styles.input}
      />
      {nameError ? (
        <HelperText type="error" accessibilityLiveRegion="polite">
          {nameError}
        </HelperText>
      ) : null}

      <TextInput
        label="Description (optional)"
        value={description}
        onChangeText={setDescription}
        multiline
        maxLength={500}
        accessibilityLabel="Server description"
        style={styles.input}
      />

      <SegmentedButtons
        value={visibility}
        onValueChange={(v) => setVisibility(v as 'public' | 'private')}
        buttons={[
          { value: 'private', label: 'Private' },
          { value: 'public', label: 'Public' },
        ]}
        style={styles.segment}
      />

      <Button
        mode="contained"
        onPress={handleSubmit}
        disabled={!name.trim() || (isLoading ?? false)}
        loading={isLoading ?? false}
        accessibilityLabel="Create server"
        style={styles.button}
      >
        Create Server
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  input: {
    // default styling
  },
  segment: {
    marginVertical: 8,
  },
  button: {
    marginTop: 8,
  },
});
