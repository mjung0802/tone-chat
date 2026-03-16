import React from "react";
import { fireEvent } from "@testing-library/react-native";
import { AttachmentViewer } from "./AttachmentViewer";
import { renderWithProviders } from "../../test-utils/renderWithProviders";
import { makeAttachment } from "../../test-utils/fixtures";

describe("AttachmentViewer", () => {
  it("does not render modal when attachment is null", () => {
    const { queryByLabelText } = renderWithProviders(
      <AttachmentViewer visible={true} attachment={null} onClose={jest.fn()} />,
    );

    expect(queryByLabelText("Close viewer")).toBeNull();
  });

  it("does not render modal when attachment has no URL", () => {
    const attachment = makeAttachment({ url: null });

    const { queryByLabelText } = renderWithProviders(
      <AttachmentViewer
        visible={true}
        attachment={attachment}
        onClose={jest.fn()}
      />,
    );

    expect(queryByLabelText("Close viewer")).toBeNull();
  });

  it("renders filename in header when visible", () => {
    const attachment = makeAttachment({ filename: "sunset.jpg" });

    const { getByText } = renderWithProviders(
      <AttachmentViewer
        visible={true}
        attachment={attachment}
        onClose={jest.fn()}
      />,
    );

    expect(getByText("sunset.jpg")).toBeTruthy();
  });

  it("close button calls onClose", () => {
    const attachment = makeAttachment();
    const onClose = jest.fn();

    const { getByLabelText } = renderWithProviders(
      <AttachmentViewer
        visible={true}
        attachment={attachment}
        onClose={onClose}
      />,
    );

    fireEvent.press(getByLabelText("Close viewer"));

    expect(onClose).toHaveBeenCalled();
  });

  it("renders image with correct source URI", () => {
    const attachment = makeAttachment({
      filename: "banner.jpg",
      url: "http://localhost:9000/uploads/banner.jpg",
    });

    const { getByLabelText } = renderWithProviders(
      <AttachmentViewer
        visible={true}
        attachment={attachment}
        onClose={jest.fn()}
      />,
    );

    const image = getByLabelText("banner.jpg");
    expect(image.props.source).toEqual({
      uri: "http://localhost:9000/uploads/banner.jpg",
    });
  });
});
