import React from "react";
import { List } from "react-native-paper";
import { ServerIcon } from "./ServerIcon";
import type { Server } from "../../types/models";

interface ServerListItemProps {
  server: Server;
  onPress: (server: Server) => void;
}

export function ServerListItem({ server, onPress }: ServerListItemProps) {
  return (
    <List.Item
      title={server.name}
      description={server.description}
      left={() => (
        <ServerIcon name={server.name} icon={server.icon} size={40} />
      )}
      onPress={() => onPress(server)}
      accessibilityRole="button"
      accessibilityLabel={`${server.name} server${server.description ? `, ${server.description}` : ""}`}
      accessibilityHint="Opens this server"
      style={{ minHeight: 56, paddingLeft: 12 }}
    />
  );
}
