import { renderHook, waitFor } from "@testing-library/react-native";
import * as attachmentsApi from "../api/attachments.api";
import { useAttachment, useUpload } from "./useAttachments";
import { createHookWrapper } from "../test-utils/renderWithProviders";
import { makeAttachment } from "../test-utils/fixtures";

jest.mock("../api/attachments.api");

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useAttachment", () => {
  it("fetches attachment by ID and returns data", async () => {
    const attachment = makeAttachment();
    jest
      .mocked(attachmentsApi.getAttachment)
      .mockResolvedValueOnce({ attachment });

    const { result } = renderHook(() => useAttachment("att-1"), {
      wrapper: createHookWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(attachmentsApi.getAttachment).toHaveBeenCalledWith("att-1");
    expect(result.current.data?.attachment).toEqual(attachment);
  });

  it("does not fetch when attachmentId is empty string", () => {
    const { result } = renderHook(() => useAttachment(""), {
      wrapper: createHookWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(attachmentsApi.getAttachment).not.toHaveBeenCalled();
  });
});

describe("useUpload", () => {
  it("calls uploadAttachment with correct args and returns attachment", async () => {
    const attachment = makeAttachment();
    jest
      .mocked(attachmentsApi.uploadAttachment)
      .mockResolvedValueOnce({ attachment });

    const { result } = renderHook(() => useUpload(), {
      wrapper: createHookWrapper(),
    });

    const blob = new Blob(["test"], { type: "image/png" });
    result.current.mutate({
      data: blob,
      filename: "photo.png",
      contentType: "image/png",
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(attachmentsApi.uploadAttachment).toHaveBeenCalledWith(
      blob,
      "photo.png",
      "image/png",
    );
    expect(result.current.data?.attachment).toEqual(attachment);
  });
});
