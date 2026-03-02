import React from 'react';
import { Drawer } from 'expo-router/drawer';
import { useServers } from '../../src/hooks/useServers';
import { useLogout } from '../../src/hooks/useAuth';
import { DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { View, StyleSheet } from 'react-native';
import { Divider, Text, IconButton, Icon, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { ServerIcon } from '../../src/components/servers/ServerIcon';

function CustomDrawerContent(props: any) {
  const { data: servers } = useServers();
  const logout = useLogout();
  const router = useRouter();
  const theme = useTheme();

  return (
    <DrawerContentScrollView {...props} style={{ backgroundColor: theme.colors.background }}>
      <View style={styles.drawerHeader}>
        <Text variant="titleLarge">Tone Chat</Text>
      </View>
      <Divider />

      <DrawerItem
        label="Home"
        icon={({ size, color }) => <Icon source="home" size={size} color={color} />}
        onPress={() => router.push('/(main)/servers')}
      />

      <Divider />
      <View style={styles.sectionHeader}>
        <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
          Servers
        </Text>
        <IconButton
          icon="plus"
          size={18}
          onPress={() => router.push('/(main)/servers/create')}
          accessibilityLabel="Create server"
        />
      </View>

      {servers?.map((server) => (
        <DrawerItem
          key={server._id}
          label={server.name}
          icon={() => <ServerIcon name={server.name} icon={server.icon} size={28} />}
          onPress={() => router.push(`/(main)/servers/${server._id}`)}
        />
      ))}

      <Divider style={styles.bottomDivider} />

      <DrawerItem
        label="Profile"
        icon={({ size, color }) => <Icon source="account" size={size} color={color} />}
        onPress={() => router.push('/(main)/profile')}
      />

      <DrawerItem
        label="Sign Out"
        icon={({ size, color }) => <Icon source="logout" size={size} color={color} />}
        onPress={logout}
      />
    </DrawerContentScrollView>
  );
}

export default function MainLayout() {
  const theme = useTheme();
  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.colors.surface, borderBottomColor: 'white' },
        headerTintColor: theme.colors.onSurface,
        drawerType: 'front',
        drawerStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Drawer.Screen name="servers/index" options={{ title: 'Servers' }} />
      <Drawer.Screen name="servers/create" options={{ title: 'Create Server' }} />
      <Drawer.Screen
        name="servers/[serverId]"
        options={{ headerShown: false }}
      />
      <Drawer.Screen name="profile/index" options={{ title: 'Profile' }} />
      <Drawer.Screen name="invites/[code]" options={{ title: 'Join Server' }} />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  drawerHeader: {
    padding: 16,
    paddingBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  bottomDivider: {
    marginTop: 8,
  },
});
