import { FriendsPage } from '@/components/friends/FriendsPage';
import { Stack } from 'expo-router';
import { View, StyleSheet } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Friends', headerBackVisible: false }} />
      <FriendsPage />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
