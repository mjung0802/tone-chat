import { ServerIcon } from '@/components/servers/ServerIcon';
import { NotificationBanner } from '@/components/common/NotificationBanner';
import { UserProfileModal } from '@/components/common/UserProfileModal';
import { useLogout } from '@/hooks/useAuth';
import { useMentionNotifications } from '@/hooks/useMentionNotifications';
import { useServers } from '@/hooks/useServers';
import { DrawerContentScrollView, DrawerItem, type DrawerContentComponentProps } from '@react-navigation/drawer';
import { useRouter } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Divider, Icon, IconButton, Portal, Text, useTheme } from 'react-native-paper';

function ProfileHeaderButton() {
  const router = useRouter();
  return (
    <IconButton
      icon="account-circle"
      onPress={() => router.push('/(main)/profile')}
      accessibilityLabel="Edit profile"
      accessibilityRole="button"
    />
  );
}

function CustomDrawerContent(props: DrawerContentComponentProps) {
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

  useMentionNotifications();

  return (
    <>
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
        <Drawer.Screen
          name="servers/index"
          options={{
            title: 'Servers',
            headerRight: () => <ProfileHeaderButton />,
          }}
        />
        <Drawer.Screen name="servers/create" options={{ title: 'Create Server' }} />
        <Drawer.Screen
          name="servers/[serverId]"
          options={{ headerShown: false }}
        />
        <Drawer.Screen name="profile/index" options={{ title: 'Profile' }} />
        <Drawer.Screen name="invites/[code]" options={{ title: 'Join Server' }} />
      </Drawer>
      <Portal>
        <NotificationBanner />
      </Portal>
      <UserProfileModal />
    </>
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
