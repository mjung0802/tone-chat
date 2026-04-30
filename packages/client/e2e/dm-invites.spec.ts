import { test, expect, type Page } from '@playwright/test';
import {
  mockSocketIO,
  mockServersRoutes,
  mockChannelsRoutes,
  mockMembersRoutes,
  mockUsersRoutes,
  mockInviteStatusRoute,
  mockJoinViaCodeRoute,
  type InviteStatusMock,
} from './helpers/mocks';
import { MOCK_USER, MOCK_USER_TWO, MOCK_SERVER } from './helpers/fixtures';

const API = 'http://localhost:4000/api/v1';

const MOCK_CONVERSATION = {
  _id: 'conv1',
  participantIds: [MOCK_USER.id, MOCK_USER_TWO.id] as [string, string],
  lastMessageAt: null,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

const INVITE_CODE = 'invite-abc';
const INVITED_SERVER_ID = 'server-002';
const INVITED_SERVER_NAME = 'Cool Hangout';

const DM_MESSAGE_WITH_INVITE = {
  _id: 'dm-invite-1',
  conversationId: 'conv1',
  authorId: MOCK_USER_TWO.id,
  content: '',
  attachmentIds: [],
  mentions: [],
  reactions: [],
  tone: null,
  editedAt: null,
  serverInvite: {
    code: INVITE_CODE,
    serverId: INVITED_SERVER_ID,
    serverName: INVITED_SERVER_NAME,
  },
  createdAt: '2024-01-01T00:00:00.000Z',
};

async function mockDmRoutesWithInvite(page: Page): Promise<void> {
  await page.route(`${API}/dms`, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ conversations: [MOCK_CONVERSATION] }),
      });
    } else {
      await route.continue();
    }
  });

  await page.route(`${API}/dms/conv1`, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ conversation: MOCK_CONVERSATION }),
      });
    } else {
      await route.continue();
    }
  });

  await page.route(/\/api\/v1\/dms\/conv1\/messages(\?.*)?$/, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ messages: [DM_MESSAGE_WITH_INVITE] }),
      });
    } else {
      await route.continue();
    }
  });

  await page.route(`${API}/users/me/blocks`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ blockedIds: [] }),
    });
  });
}

function makeStatus(overrides: Partial<InviteStatusMock> = {}): InviteStatusMock {
  return {
    code: INVITE_CODE,
    serverId: INVITED_SERVER_ID,
    serverName: INVITED_SERVER_NAME,
    status: 'valid',
    alreadyMember: false,
    banned: false,
    ...overrides,
  };
}

test.beforeEach(async ({ page }) => {
  await mockSocketIO(page);
  await mockUsersRoutes(page);
  await mockChannelsRoutes(page);
  await mockMembersRoutes(page);
  await mockDmRoutesWithInvite(page);
});

test('DM invite — already a member shows disabled card with explanation', async ({ page }) => {
  const memberServer = { ...MOCK_SERVER, _id: INVITED_SERVER_ID, name: INVITED_SERVER_NAME };
  await mockServersRoutes(page, [memberServer]);
  await mockInviteStatusRoute(page, makeStatus({ alreadyMember: true }));

  await page.goto('/(main)/home/conv1');

  await expect(page.getByRole('button', { name: `Already a member — ${INVITED_SERVER_NAME}` })).toBeVisible();
  await expect(page.getByRole('button', { name: `Already a member — ${INVITED_SERVER_NAME}` })).toBeDisabled();
  await expect(page.getByText('You\'re already a member of this server.')).toBeVisible();
});

test('DM invite — expired invite shows disabled card with expired reason', async ({ page }) => {
  await mockServersRoutes(page, []);
  await mockInviteStatusRoute(page, makeStatus({ status: 'expired' }));

  await page.goto('/(main)/home/conv1');

  await expect(page.getByRole('button', { name: `Invite expired — ${INVITED_SERVER_NAME}` })).toBeVisible();
  await expect(page.getByRole('button', { name: `Invite expired — ${INVITED_SERVER_NAME}` })).toBeDisabled();
  await expect(page.getByText('This invite has expired.')).toBeVisible();
});

test('DM invite — successful join navigates to the server', async ({ page }) => {
  await mockServersRoutes(page, []);
  await mockInviteStatusRoute(page, makeStatus());
  await mockJoinViaCodeRoute(page, {
    ...MOCK_SERVER,
    _id: INVITED_SERVER_ID,
    name: INVITED_SERVER_NAME,
  });

  await page.goto('/(main)/home/conv1');

  const joinBtn = page.getByRole('button', { name: `Join ${INVITED_SERVER_NAME}` });
  await expect(joinBtn).toBeVisible();
  await expect(joinBtn).toBeEnabled();
  await joinBtn.click();

  await expect(page).toHaveURL(/\/servers\/server-002/);
});
