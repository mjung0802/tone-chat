import React from 'react';
import { Avatar, useTheme } from 'react-native-paper';
import { useAttachment } from '@/hooks/useAttachments';

interface ServerIconProps {
  name: string;
  icon?: string | undefined;
  size?: number | undefined;
}

function InitialsIcon({ name, size }: { name: string; size: number }) {
  const theme = useTheme();

  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <Avatar.Text
      label={initials}
      size={size}
      style={{ backgroundColor: theme.colors.primaryContainer }}
      labelStyle={{ color: theme.colors.onPrimaryContainer }}
      accessibilityLabel={`${name} server icon`}
    />
  );
}

function IconWithAttachment({ attachmentId, name, size }: { attachmentId: string; name: string; size: number }) {
  const { data } = useAttachment(attachmentId);
  const attachment = data?.attachment;

  if (attachment?.status === 'ready' && attachment.url) {
    return (
      <Avatar.Image
        source={{ uri: attachment.url }}
        size={size}
        accessibilityLabel={`${name} server icon`}
      />
    );
  }

  return <InitialsIcon name={name} size={size} />;
}

export function ServerIcon({ name, icon, size = 48 }: ServerIconProps) {
  if (icon) {
    return <IconWithAttachment attachmentId={icon} name={name} size={size} />;
  }

  return <InitialsIcon name={name} size={size} />;
}
