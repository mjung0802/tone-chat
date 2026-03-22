import { EmptyState } from '@/components/common/EmptyState';
import { View, StyleSheet } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <EmptyState
        icon="message-outline"
        title="No conversation selected"
        description="Select a conversation from the list or find someone to message."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
