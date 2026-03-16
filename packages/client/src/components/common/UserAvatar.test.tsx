import React from "react";
import { renderWithProviders } from "../../test-utils/renderWithProviders";
import { UserAvatar } from "./UserAvatar";

jest.mock("../../hooks/useAttachments", () => ({
  useAttachment: jest.fn(),
}));

import { useAttachment } from "../../hooks/useAttachments";

describe("UserAvatar", () => {
  beforeEach(() => {
    jest.mocked(useAttachment).mockReset();
  });

  it("renders initials when no avatarAttachmentId", () => {
    const { getByLabelText } = renderWithProviders(<UserAvatar name="Alice" />);
    expect(getByLabelText("Alice's avatar")).toBeTruthy();
  });

  it("renders initials while attachment is loading", () => {
    jest.mocked(useAttachment).mockReturnValue({
      isLoading: true,
      data: undefined,
    } as ReturnType<typeof useAttachment>);

    const { getByLabelText } = renderWithProviders(
      <UserAvatar avatarAttachmentId="att-1" name="Bob" />,
    );
    expect(getByLabelText("Bob's avatar")).toBeTruthy();
  });

  it("renders image when attachment resolves", () => {
    jest.mocked(useAttachment).mockReturnValue({
      isLoading: false,
      data: {
        attachment: {
          id: "att-1",
          status: "ready",
          url: "https://example.com/avatar.jpg",
          uploader_id: "u1",
          filename: "avatar.jpg",
          mime_type: "image/jpeg",
          size_bytes: 1000,
          storage_key: "avatars/avatar.jpg",
          created_at: "2025-01-01T00:00:00.000Z",
        },
      },
    } as ReturnType<typeof useAttachment>);

    const { getByLabelText } = renderWithProviders(
      <UserAvatar avatarAttachmentId="att-1" name="Charlie" />,
    );
    expect(getByLabelText("Charlie's avatar")).toBeTruthy();
  });

  it("falls back to initials on failed attachment", () => {
    jest.mocked(useAttachment).mockReturnValue({
      isLoading: false,
      data: {
        attachment: {
          id: "att-1",
          status: "failed",
          url: null,
          uploader_id: "u1",
          filename: "avatar.jpg",
          mime_type: "image/jpeg",
          size_bytes: 1000,
          storage_key: "avatars/avatar.jpg",
          created_at: "2025-01-01T00:00:00.000Z",
        },
      },
    } as ReturnType<typeof useAttachment>);

    const { getByLabelText } = renderWithProviders(
      <UserAvatar avatarAttachmentId="att-1" name="Diana" />,
    );
    expect(getByLabelText("Diana's avatar")).toBeTruthy();
  });
});
