import React from "react";
import { Avatar } from "react-native-paper";
import { useAttachment } from "../../hooks/useAttachments";

interface UserAvatarProps {
  avatarAttachmentId?: string | null | undefined;
  name: string;
  size?: number | undefined;
}

function InitialsAvatar({ name, size }: { name: string; size: number }) {
  return (
    <Avatar.Text
      label={name.slice(0, 1).toUpperCase()}
      size={size}
      accessibilityLabel={`${name}'s avatar`}
    />
  );
}

function AvatarWithAttachment({
  attachmentId,
  name,
  size,
}: {
  attachmentId: string;
  name: string;
  size: number;
}) {
  const { data } = useAttachment(attachmentId);
  const attachment = data?.attachment;

  if (attachment?.status === "ready" && attachment.url) {
    return (
      <Avatar.Image
        source={{ uri: attachment.url }}
        size={size}
        accessibilityLabel={`${name}'s avatar`}
      />
    );
  }

  return <InitialsAvatar name={name} size={size} />;
}

export function UserAvatar({
  avatarAttachmentId,
  name,
  size = 32,
}: UserAvatarProps) {
  if (avatarAttachmentId) {
    return (
      <AvatarWithAttachment
        attachmentId={avatarAttachmentId}
        name={name}
        size={size}
      />
    );
  }

  return <InitialsAvatar name={name} size={size} />;
}
