import { EmptyState } from '@/components/common/EmptyState';
import { FriendsPage } from '@/components/friends/FriendsPage';
import { useUiStore } from '@/stores/uiStore';
import { Stack } from 'expo-router';
import { View, StyleSheet } from 'react-native';

export default function HomeScreen() {
  const isFriendsViewOpen = useUiStore((s) => s.isFriendsViewOpen);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Friends', headerBackVisible: false }} />
      {isFriendsViewOpen ? (
        <FriendsPage />
      ) : (
        <EmptyState
          icon="message-outline"
          title="No conversation selected"
          description="Select a conversation from the list or find someone to message."
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
