import React from "react";
import { fireEvent } from "@testing-library/react-native";
import { ReactionChips } from "./ReactionChips";
import { renderWithProviders } from "../../test-utils/renderWithProviders";

describe("ReactionChips", () => {
  const defaultProps = {
    reactions: [
      { emoji: "👍", userIds: ["u1", "u2"] },
      { emoji: "🔥", userIds: ["u1"] },
    ],
    currentUserId: "u1",
    authorNames: { u1: "Alice", u2: "Bob" },
    onToggle: jest.fn(),
    onAddReaction: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders emoji and count for each reaction", () => {
    const { getByText } = renderWithProviders(
      <ReactionChips {...defaultProps} />,
    );
    expect(getByText("👍 2")).toBeTruthy();
    expect(getByText("🔥 1")).toBeTruthy();
  });

  it("calls onToggle with correct emoji when chip pressed", () => {
    const onToggle = jest.fn();
    const { getByTestId } = renderWithProviders(
      <ReactionChips {...defaultProps} onToggle={onToggle} />,
    );
    fireEvent.press(getByTestId("reaction-chip-👍"));
    expect(onToggle).toHaveBeenCalledWith("👍");
  });

  it("calls onAddReaction when add button pressed", () => {
    const onAddReaction = jest.fn();
    const { getByTestId } = renderWithProviders(
      <ReactionChips {...defaultProps} onAddReaction={onAddReaction} />,
    );
    fireEvent.press(getByTestId("add-reaction-button"));
    expect(onAddReaction).toHaveBeenCalled();
  });

  it("renders nothing for empty reactions array", () => {
    const { queryByTestId } = renderWithProviders(
      <ReactionChips {...defaultProps} reactions={[]} />,
    );
    expect(queryByTestId("add-reaction-button")).toBeNull();
    expect(queryByTestId(/^reaction-chip-/)).toBeNull();
  });

  it("accessibility label includes emoji count and usernames", () => {
    const { getByLabelText } = renderWithProviders(
      <ReactionChips {...defaultProps} />,
    );
    expect(getByLabelText(/👍 2 reactions, Alice, Bob/)).toBeTruthy();
    expect(getByLabelText(/🔥 1 reaction, Alice/)).toBeTruthy();
  });

  it("add reaction button has accessibility label", () => {
    const { getByLabelText } = renderWithProviders(
      <ReactionChips {...defaultProps} />,
    );
    expect(getByLabelText("Add reaction")).toBeTruthy();
  });
});
