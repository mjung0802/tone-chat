import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { CreateServerForm } from '../../../src/components/servers/CreateServerForm';
import { useCreateServer } from '../../../src/hooks/useServers';

export default function CreateServerScreen() {
  const router = useRouter();
  const createMutation = useCreateServer();

  const handleSubmit = (data: {
    name: string;
    description?: string | undefined;
    visibility: 'public' | 'private';
  }) => {
    createMutation.mutate(data, {
      onSuccess: (response) => {
        router.replace(`/(main)/servers/${response.server._id}`);
      },
    });
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <CreateServerForm onSubmit={handleSubmit} isLoading={createMutation.isPending} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
});
