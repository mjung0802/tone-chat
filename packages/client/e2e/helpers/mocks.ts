import type { Page } from '@playwright/test';
import {
  MOCK_ACCESS_TOKEN,
  MOCK_REFRESH_TOKEN,
  MOCK_USER,
  MOCK_SERVER,
  MOCK_CHANNEL,
  MOCK_MESSAGES,
  MOCK_MEMBERS,
} from './fixtures';

const API = 'http://localhost:4000/api/v1';

export async function mockAuthRoutes(page: Page): Promise<void> {
  await page.route(`${API}/auth/login`, async (route) => {
    const body = route.request().postDataJSON() as { email?: string; password?: string };
    if (body.email === 'test@example.com' && body.password === 'password123') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: MOCK_USER,
          accessToken: MOCK_ACCESS_TOKEN,
          refreshToken: MOCK_REFRESH_TOKEN,
        }),
      });
    } else {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password', status: 401 } }),
      });
    }
  });

  await page.route(`${API}/auth/register`, async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        user: MOCK_USER,
        accessToken: MOCK_ACCESS_TOKEN,
        refreshToken: MOCK_REFRESH_TOKEN,
      }),
    });
  });

  await page.route(`${API}/auth/refresh`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: MOCK_ACCESS_TOKEN,
        refreshToken: MOCK_REFRESH_TOKEN,
      }),
    });
  });
}

export async function mockSocketIO(page: Page): Promise<void> {
  await page.routeWebSocket(/localhost:4000/, (ws) => {
    // Accept the connection and silently drop all frames — no real Socket.IO server needed
    ws.onMessage(() => {
      // do nothing
    });
  });
}

export async function mockServersRoutes(page: Page, servers = [MOCK_SERVER]): Promise<void> {
  // Individual server endpoint GET /servers/:id
  await page.route(`${API}/servers/*`, async (route) => {
    if (route.request().method() === 'GET') {
      const url = route.request().url();
      const serverId = url.split('/servers/')[1];
      const server = servers.find((s) => s._id === serverId) ?? servers[0];
      if (server) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ server }),
        });
      } else {
        await route.fulfill({ status: 404, body: '{}' });
      }
    } else {
      await route.continue();
    }
  });

  // Server list endpoint GET /servers
  await page.route(`${API}/servers`, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ servers }),
      });
    } else {
      await route.continue();
    }
  });
}

export async function mockChannelsRoutes(page: Page, channels = [MOCK_CHANNEL]): Promise<void> {
  // Individual channel endpoint GET /servers/:sid/channels/:cid
  await page.route(`${API}/servers/*/channels/*`, async (route) => {
    if (route.request().method() === 'GET') {
      const url = route.request().url();
      const channelId = url.split('/channels/')[1];
      const channel = channels.find((c) => c._id === channelId) ?? channels[0];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ channel }),
      });
    } else {
      await route.continue();
    }
  });

  // Channel list endpoint GET /servers/:sid/channels
  await page.route(`${API}/servers/*/channels`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ channels }),
    });
  });
}

export async function mockMessagesRoutes(page: Page, messages = MOCK_MESSAGES): Promise<void> {
  // Use regex for reliable matching with query params (limit=50, etc.)
  await page.route(
    /http:\/\/localhost:4000\/api\/v1\/servers\/[^/]+\/channels\/[^/]+\/messages(\?.*)?$/,
    async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ messages }),
        });
      } else if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON() as { content?: string };
        const newMessage = {
          _id: `msg-new-${Date.now()}`,
          channelId: 'channel-001',
          serverId: 'server-001',
          authorId: 'user-001',
          content: body.content ?? '',
          attachmentIds: [],
          createdAt: new Date().toISOString(),
        };
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ message: newMessage }),
        });
      } else {
        await route.continue();
      }
    },
  );
}

export async function mockUsersRoutes(page: Page): Promise<void> {
  await page.route(`${API}/users/me`, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: MOCK_USER }),
      });
    } else if (route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON() as Record<string, string>;
      const updatedUser = { ...MOCK_USER, ...body };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: updatedUser }),
      });
    } else {
      await route.continue();
    }
  });
}

export async function mockReactionRoutes(page: Page): Promise<void> {
  await page.route(
    /http:\/\/localhost:4000\/api\/v1\/servers\/[^/]+\/channels\/[^/]+\/messages\/[^/]+\/reactions$/,
    async (route) => {
      if (route.request().method() === 'PUT') {
        const body = route.request().postDataJSON() as { emoji?: string };
        const url = route.request().url();
        const messageId = url.split('/messages/')[1]!.split('/reactions')[0];
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            message: {
              _id: messageId,
              channelId: 'channel-001',
              serverId: 'server-001',
              authorId: 'user-001',
              content: 'Hello from test',
              attachmentIds: [],
              reactions: [{ emoji: body.emoji ?? '👍', userIds: ['user-001'] }],
              createdAt: '2024-01-01T00:00:00.000Z',
            },
          }),
        });
      } else {
        await route.continue();
      }
    },
  );
}

export async function mockMembersRoutes(page: Page): Promise<void> {
  await page.route(`${API}/servers/*/members`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ members: MOCK_MEMBERS }),
    });
  });
}

export async function mockVerifyEmailRoute(page: Page): Promise<void> {
  await page.route(`${API}/auth/verify-email`, async (route) => {
    const body = route.request().postDataJSON() as { code?: string };
    if (body.code === '123456') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Email verified' }),
      });
    } else if (body.code === 'expired') {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'CODE_EXPIRED', message: 'Verification code has expired', status: 400 } }),
      });
    } else {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'INVALID_CODE', message: 'Invalid verification code', status: 400 } }),
      });
    }
  });
}

export async function mockResendVerificationRoute(page: Page): Promise<void> {
  await page.route(`${API}/auth/resend-verification`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Verification email sent' }),
    });
  });
}

export async function mockUnverifiedLoginRoute(page: Page): Promise<void> {
  await page.route(`${API}/auth/login`, async (route) => {
    const body = route.request().postDataJSON() as { email?: string; password?: string };
    if (body.email === 'unverified@example.com' && body.password === 'password123') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { ...MOCK_USER, email: 'unverified@example.com', email_verified: false },
          accessToken: MOCK_ACCESS_TOKEN,
          refreshToken: MOCK_REFRESH_TOKEN,
        }),
      });
    } else {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password', status: 401 } }),
      });
    }
  });
}
