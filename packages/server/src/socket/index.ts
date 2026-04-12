import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { getMember } from '../members/members.client.js';
import { getChannel } from '../channels/channels.client.js';
import { registerMessageHandlers } from '../messages/messages.socket.js';
import { setIO } from '../messages/messages.routes.js';
import { setDmIO } from '../dms/dms.routes.js';
import { registerDmHandlers } from '../dms/dms.socket.js';
import { logger } from '../shared/logger.js';

let ioInstance: Server | null = null;

export function getIO(): Server | null {
  return ioInstance;
}

/** Remove a user from all Socket.IO rooms for a given server */
export async function removeUserFromServerRooms(userId: string, serverId: string): Promise<void> {
  if (!ioInstance) return;
  const sockets = await ioInstance.in(`user:${userId}`).fetchSockets();
  for (const s of sockets) {
    for (const room of s.rooms) {
      if (room.startsWith(`server:${serverId}:`)) {
        void s.leave(room);
      }
    }
  }
}

export function setupSocketIO(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: config.allowedOrigins,
      credentials: true,
    },
    connectionStateRecovery: {},
  });

  ioInstance = io;
  setIO(io);
  setDmIO(io);

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
      socket.data['userToken'] = token;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data['userId'] as string;
    const userToken = socket.data['userToken'] as string;
    logger.info({ userId }, 'Socket connected');

    // Join user-level room for targeted events (mentions)
    void socket.join(`user:${userId}`);

    // Room management — verify membership and channel existence before joining
    socket.on('join_channel', async (data: { serverId: string; channelId: string }) => {
      const [memberResult, channelResult] = await Promise.all([
        getMember(userToken, data.serverId, userId),
        getChannel(userToken, data.serverId, data.channelId),
      ]);
      if (memberResult.status !== 200) {
        socket.emit('error', { message: 'Not a member of this server' });
        return;
      }
      if (channelResult.status !== 200) {
        socket.emit('error', { message: 'Channel not found' });
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
    registerMessageHandlers(io, socket, userToken, userId);
    registerDmHandlers(io, socket, userToken, userId);

    socket.on('disconnect', () => {
      logger.info({ userId }, 'Socket disconnected');
    });
  });

  return io;
}
