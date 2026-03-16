import { test, expect } from "@playwright/test";
import {
  mockSocketIO,
  mockServersRoutes,
  mockChannelsRoutes,
  mockMessagesRoutes,
  mockMembersRoutes,
  mockUsersRoutes,
} from "./helpers/mocks";
import {
  MOCK_MESSAGES,
  MOCK_USER,
  MOCK_MEMBERS_FULL,
  MOCK_MESSAGE_WITH_REPLY,
  MOCK_MESSAGE_WITH_MENTION,
  MOCK_ATTACHMENT_AVATAR,
} from "./helpers/fixtures";

const CHANNEL_URL = "/servers/server-001/channels/channel-001";

test.beforeEach(async ({ page }) => {
  await mockSocketIO(page);
  await mockUsersRoutes(page);
  await mockServersRoutes(page);
  await mockChannelsRoutes(page);
  await mockMembersRoutes(page);
});

test("displays messages in channel", async ({ page }) => {
  await mockMessagesRoutes(page);

  await page.goto(CHANNEL_URL);

  await expect(page.getByText(MOCK_MESSAGES[0]!.content)).toBeVisible();
  await expect(page.getByText(MOCK_MESSAGES[1]!.content)).toBeVisible();
});

test("sends a text message and it appears in the list", async ({ page }) => {
  const sentContent = "This is a new E2E test message";

  // Handle both GET (existing messages) and POST (new message) in one handler
  await page.route(
    /http:\/\/localhost:4000\/api\/v1\/servers\/[^/]+\/channels\/[^/]+\/messages(\?.*)?$/,
    async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ messages: MOCK_MESSAGES }),
        });
      } else if (route.request().method() === "POST") {
        const body = route.request().postDataJSON() as { content?: string };
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            message: {
              _id: "msg-sent",
              channelId: "channel-001",
              serverId: "server-001",
              authorId: "user-001",
              content: body.content ?? "",
              attachmentIds: [],
              createdAt: new Date().toISOString(),
            },
          }),
        });
      } else {
        await route.continue();
      }
    },
  );

  await page.goto(CHANNEL_URL);

  await page.getByLabel("Message input").fill(sentContent);
  await page.getByLabel("Send message").click();

  await expect(page.getByText(sentContent)).toBeVisible();
});

test("displays existing reaction chips on messages", async ({ page }) => {
  await mockMessagesRoutes(page);

  await page.goto(CHANNEL_URL);

  // First message has reactions, verify chips are visible
  await expect(page.getByTestId("reaction-chip-👍")).toBeVisible();
  await expect(page.getByTestId("reaction-chip-🔥")).toBeVisible();
});

test("hover shows add-reaction button", async ({ page }) => {
  await mockMessagesRoutes(page);

  await page.goto(CHANNEL_URL);

  // Hover over the first message
  const messageContainer = page.getByLabel(
    `${MOCK_USER.display_name} said: ${MOCK_MESSAGES[0]!.content}`,
    { exact: false },
  );
  await messageContainer.hover();

  await expect(
    messageContainer.getByTestId("hover-reaction-button"),
  ).toBeVisible();
});

test("click add-reaction opens emoji picker", async ({ page }) => {
  await mockMessagesRoutes(page);

  await page.goto(CHANNEL_URL);

  const messageContainer = page.getByLabel(
    `${MOCK_USER.display_name} said: ${MOCK_MESSAGES[0]!.content}`,
    { exact: false },
  );
  await messageContainer.hover();

  await messageContainer.getByTestId("hover-reaction-button").click();

  await expect(page.getByTestId("emoji-picker-modal")).toBeVisible();
});

test("send button is disabled while message is empty", async ({ page }) => {
  await mockMessagesRoutes(page);

  await page.goto(CHANNEL_URL);

  // Without any input text, send button should be disabled
  const sendButton = page.getByLabel("Send message");
  await expect(sendButton).toBeDisabled();

  // After typing, send button becomes enabled
  await page.getByLabel("Message input").fill("hello");
  await expect(sendButton).toBeEnabled();
});

// --- Reply Tests ---

test("displays reply indicator on a message with replyTo", async ({ page }) => {
  await mockMessagesRoutes(page, [...MOCK_MESSAGES, MOCK_MESSAGE_WITH_REPLY]);
  await mockMembersRoutes(page, MOCK_MEMBERS_FULL);

  await page.goto(CHANNEL_URL);

  // Reply indicator should show the replied-to author
  await expect(page.getByLabel(/Reply to Jane Doe/)).toBeVisible();
  // Reply content preview should be visible
  await expect(page.getByText("Hello from test").first()).toBeVisible();
});

test("hover shows reply button and clicking it opens reply preview", async ({
  page,
}) => {
  await mockMessagesRoutes(page);
  await mockMembersRoutes(page, MOCK_MEMBERS_FULL);

  await page.goto(CHANNEL_URL);

  // Hover over a message to reveal the reply button
  const messageContainer = page.getByLabel(
    `${MOCK_USER.display_name} said: ${MOCK_MESSAGES[0]!.content}`,
    { exact: false },
  );
  await messageContainer.hover();

  const replyButton = messageContainer.getByTestId("hover-reply-button");
  await expect(replyButton).toBeVisible();

  // Click reply → reply preview bar appears
  await replyButton.click();

  await expect(
    page.getByText(`Replying to @${MOCK_USER.display_name}`),
  ).toBeVisible();
  await expect(page.getByLabel("Cancel reply")).toBeVisible();
});

test("cancel reply removes the reply preview bar", async ({ page }) => {
  await mockMessagesRoutes(page);
  await mockMembersRoutes(page, MOCK_MEMBERS_FULL);

  await page.goto(CHANNEL_URL);

  // Trigger reply mode
  const messageContainer = page.getByLabel(
    `${MOCK_USER.display_name} said: ${MOCK_MESSAGES[0]!.content}`,
    { exact: false },
  );
  await messageContainer.hover();
  await messageContainer.getByTestId("hover-reply-button").click();

  // Verify reply preview is visible
  await expect(
    page.getByText(`Replying to @${MOCK_USER.display_name}`),
  ).toBeVisible();

  // Cancel reply
  await page.getByLabel("Cancel reply").click();

  // Reply preview should disappear
  await expect(
    page.getByText(`Replying to @${MOCK_USER.display_name}`),
  ).not.toBeVisible();
});

test("send reply includes replyToId in request", async ({ page }) => {
  let capturedBody: unknown = null;

  await page.route(
    /http:\/\/localhost:4000\/api\/v1\/servers\/[^/]+\/channels\/[^/]+\/messages(\?.*)?$/,
    async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ messages: MOCK_MESSAGES }),
        });
      } else if (route.request().method() === "POST") {
        capturedBody = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            message: {
              _id: "msg-reply-sent",
              channelId: "channel-001",
              serverId: "server-001",
              authorId: "user-001",
              content: "My reply",
              attachmentIds: [],
              reactions: [],
              replyTo: {
                messageId: MOCK_MESSAGES[0]!._id,
                authorId: "user-001",
                authorName: MOCK_USER.display_name,
                content: MOCK_MESSAGES[0]!.content,
              },
              createdAt: new Date().toISOString(),
            },
          }),
        });
      } else {
        await route.continue();
      }
    },
  );
  await mockMembersRoutes(page, MOCK_MEMBERS_FULL);

  await page.goto(CHANNEL_URL);

  // Trigger reply mode
  const messageContainer = page.getByLabel(
    `${MOCK_USER.display_name} said: ${MOCK_MESSAGES[0]!.content}`,
    { exact: false },
  );
  await messageContainer.hover();
  await messageContainer.getByTestId("hover-reply-button").click();

  // Type and send reply
  await page.getByLabel("Message input").fill("My reply");
  await page.getByLabel("Send message").click();

  // Verify the reply text appears
  await expect(page.getByText("My reply")).toBeVisible();

  // Verify the POST body included replyToId
  expect(capturedBody).toBeTruthy();
  expect((capturedBody as { replyToId?: string }).replyToId).toBe(
    MOCK_MESSAGES[0]!._id,
  );
});

// --- Mention Tests ---

test("typing @ shows mention autocomplete with other members", async ({
  page,
}) => {
  await mockMessagesRoutes(page);
  await mockMembersRoutes(page, MOCK_MEMBERS_FULL);

  await page.goto(CHANNEL_URL);

  const input = page.getByLabel("Message input");
  await input.fill("@");
  // Trigger cursor position update
  await input.press("End");

  // Jane Doe should appear (other member), but not Test User (self)
  await expect(page.getByLabel("Mention Jane Doe")).toBeVisible();
  await expect(page.getByLabel("Mention Test User")).not.toBeVisible();
});

test("selecting a mention inserts @username into input", async ({ page }) => {
  await mockMessagesRoutes(page);
  await mockMembersRoutes(page, MOCK_MEMBERS_FULL);

  await page.goto(CHANNEL_URL);

  const input = page.getByLabel("Message input");
  await input.fill("@jan");
  await input.press("End");

  // Click the mention suggestion
  await page.getByLabel("Mention Jane Doe").click();

  // Input should now contain @janedoe with trailing space
  await expect(input).toHaveValue("@janedoe ");
});

test("sending a message with mention includes mentions in request", async ({
  page,
}) => {
  let capturedBody: unknown = null;

  await page.route(
    /http:\/\/localhost:4000\/api\/v1\/servers\/[^/]+\/channels\/[^/]+\/messages(\?.*)?$/,
    async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ messages: MOCK_MESSAGES }),
        });
      } else if (route.request().method() === "POST") {
        capturedBody = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            message: {
              _id: "msg-mention-sent",
              channelId: "channel-001",
              serverId: "server-001",
              authorId: "user-001",
              content: "@janedoe hello!",
              attachmentIds: [],
              reactions: [],
              mentions: ["user-002"],
              createdAt: new Date().toISOString(),
            },
          }),
        });
      } else {
        await route.continue();
      }
    },
  );
  await mockMembersRoutes(page, MOCK_MEMBERS_FULL);

  await page.goto(CHANNEL_URL);

  const input = page.getByLabel("Message input");
  await input.fill("@jan");
  await input.press("End");

  // Select mention
  await page.getByLabel("Mention Jane Doe").click();

  // Add more text after the mention
  await input.pressSequentially("hello!");

  // Send message
  await page.getByLabel("Send message").click();

  // Verify mentions array was sent
  expect(capturedBody).toBeTruthy();
  expect((capturedBody as { mentions?: string[] }).mentions).toEqual([
    "user-002",
  ]);
});

test("displays a message with mention highlight", async ({ page }) => {
  await mockMessagesRoutes(page, [...MOCK_MESSAGES, MOCK_MESSAGE_WITH_MENTION]);
  await mockMembersRoutes(page, MOCK_MEMBERS_FULL);

  await page.goto(CHANNEL_URL);

  // The mentioned message content should be visible
  await expect(page.getByText(MOCK_MESSAGE_WITH_MENTION.content)).toBeVisible();
});

// --- Avatar Tests ---

test("shows avatar next to messages when member has avatar_url", async ({
  page,
}) => {
  const API = "http://localhost:4000/api/v1";

  // Members with avatar_url
  const membersWithAvatar = MOCK_MEMBERS_FULL.map((m) =>
    m.userId === "user-001"
      ? { ...m, avatar_url: MOCK_ATTACHMENT_AVATAR.id }
      : m,
  );

  await mockMessagesRoutes(page);
  await mockMembersRoutes(page, membersWithAvatar);

  // Mock the attachment endpoint for the avatar
  await page.route(
    `${API}/attachments/${MOCK_ATTACHMENT_AVATAR.id}`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ attachment: MOCK_ATTACHMENT_AVATAR }),
      });
    },
  );

  await page.goto(CHANNEL_URL);

  // Avatar images should appear in the message list
  const avatarImages = page.getByLabel("Test User's avatar").locator("img");
  await expect(avatarImages.first()).toBeVisible();
});
