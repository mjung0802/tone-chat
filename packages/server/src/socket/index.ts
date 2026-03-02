import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { getMember } from '../members/members.client.js';
import { registerMessageHandlers } from '../messages/messages.socket.js';

export function setupSocketIO(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: config.allowedOrigins,
      credentials: true,
    },
    connectionStateRecovery: {},
  });

  // Auth middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth['token'] as string | undefined;
    if (!token) {
      next(new Error('Authentication required'));
      return;
    }

    try {
      const payload = jwt.verify(token, config.jwtSecret) as { sub: string };
      socket.data['userId'] = payload.sub;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data['userId'] as string;
    console.log(`Socket connected: ${userId}`);

    // Room management — verify membership before joining
    socket.on('join_channel', async (data: { serverId: string; channelId: string }) => {
      const memberResult = await getMember(userId, data.serverId, userId);
      if (memberResult.status !== 200) {
        socket.emit('error', { message: 'Not a member of this server' });
        return;
      }
      const room = `server:${data.serverId}:channel:${data.channelId}`;
      void socket.join(room);
    });

    socket.on('leave_channel', (data: { serverId: string; channelId: string }) => {
      const room = `server:${data.serverId}:channel:${data.channelId}`;
      void socket.leave(room);
    });

    // Register domain-specific handlers
    registerMessageHandlers(io, socket, userId);

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${userId}`);
    });
  });

  return io;
}
