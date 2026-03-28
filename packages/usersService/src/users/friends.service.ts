import { sql } from '../config/database.js';
import { AppError } from '../shared/middleware/errorHandler.js';

export interface FriendEntry {
  userId: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  since: string;
}

export interface FriendRequestEntry {
  userId: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  direction: 'incoming' | 'outgoing';
  created_at: string;
}

export type FriendshipStatus = 'none' | 'pending_outgoing' | 'pending_incoming' | 'friends';

export async function sendFriendRequest(
  requesterId: string,
  addresseeId: string,
): Promise<{ autoAccepted: boolean }> {
  // Check blocks in either direction
  const blocks = await sql`
    SELECT 1 FROM user_blocks
    WHERE (blocker_id = ${requesterId} AND blocked_id = ${addresseeId})
       OR (blocker_id = ${addresseeId} AND blocked_id = ${requesterId})
    LIMIT 1
  `;
  if (blocks.length > 0) {
    throw new AppError('BLOCKED', 'Cannot send friend request to this user', 403);
  }

  // Check existing row (requesterId -> addresseeId)
  const [existing] = await sql<{ status: string }[]>`
    SELECT status FROM friendships
    WHERE user_id = ${requesterId} AND friend_id = ${addresseeId}
  `;
  if (existing) {
    if (existing.status === 'accepted') {
      throw new AppError('ALREADY_FRIENDS', 'Already friends with this user', 409);
    }
    throw new AppError('REQUEST_EXISTS', 'Friend request already sent', 409);
  }

  // Check reverse row (addresseeId -> requesterId)
  const [reverse] = await sql<{ status: string }[]>`
    SELECT status FROM friendships
    WHERE user_id = ${addresseeId} AND friend_id = ${requesterId}
  `;
  if (reverse) {
    if (reverse.status === 'accepted') {
      throw new AppError('ALREADY_FRIENDS', 'Already friends with this user', 409);
    }
    // Reverse pending exists — auto-accept: update existing + insert reverse
    await sql`
      UPDATE friendships SET status = 'accepted'
      WHERE user_id = ${addresseeId} AND friend_id = ${requesterId}
    `;
    await sql`
      INSERT INTO friendships (user_id, friend_id, status)
      VALUES (${requesterId}, ${addresseeId}, 'accepted')
    `;
    return { autoAccepted: true };
  }

  // No existing relationship — create pending request
  await sql`
    INSERT INTO friendships (user_id, friend_id, status)
    VALUES (${requesterId}, ${addresseeId}, 'pending')
  `;
  return { autoAccepted: false };
}

export async function acceptFriendRequest(userId: string, requesterId: string): Promise<void> {
  // Update the pending row (requesterId -> userId) to accepted
  const result = await sql`
    UPDATE friendships SET status = 'accepted'
    WHERE user_id = ${requesterId} AND friend_id = ${userId} AND status = 'pending'
    RETURNING user_id
  `;
  if (result.length === 0) {
    throw new AppError('NOT_FOUND', 'No pending friend request found', 404);
  }

  // Insert the reverse row
  await sql`
    INSERT INTO friendships (user_id, friend_id, status)
    VALUES (${userId}, ${requesterId}, 'accepted')
    ON CONFLICT (user_id, friend_id) DO UPDATE SET status = 'accepted'
  `;
}

export async function declineOrRemoveFriend(userId: string, targetId: string): Promise<void> {
  const result = await sql`
    DELETE FROM friendships
    WHERE (user_id = ${userId} AND friend_id = ${targetId})
       OR (user_id = ${targetId} AND friend_id = ${userId})
    RETURNING user_id
  `;
  if (result.length === 0) {
    throw new AppError('NOT_FOUND', 'No friendship or request found', 404);
  }
}

export async function getFriends(userId: string): Promise<FriendEntry[]> {
  const rows = await sql<{ id: string; username: string; display_name: string | null; avatar_url: string | null; created_at: Date }[]>`
    SELECT u.id, u.username, u.display_name, u.avatar_url, f.created_at
    FROM friendships f
    JOIN users u ON u.id = f.friend_id
    WHERE f.user_id = ${userId} AND f.status = 'accepted'
    ORDER BY u.username ASC
  `;
  return rows.map((row) => ({
    userId: row.id,
    username: row.username,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    since: row.created_at.toISOString(),
  }));
}

export async function getPendingRequests(userId: string): Promise<FriendRequestEntry[]> {
  // Outgoing: user_id = userId, status = pending
  const outgoing = await sql<{ id: string; username: string; display_name: string | null; avatar_url: string | null; created_at: Date }[]>`
    SELECT u.id, u.username, u.display_name, u.avatar_url, f.created_at
    FROM friendships f
    JOIN users u ON u.id = f.friend_id
    WHERE f.user_id = ${userId} AND f.status = 'pending'
    ORDER BY f.created_at DESC
  `;

  // Incoming: friend_id = userId, status = pending
  const incoming = await sql<{ id: string; username: string; display_name: string | null; avatar_url: string | null; created_at: Date }[]>`
    SELECT u.id, u.username, u.display_name, u.avatar_url, f.created_at
    FROM friendships f
    JOIN users u ON u.id = f.user_id
    WHERE f.friend_id = ${userId} AND f.status = 'pending'
    ORDER BY f.created_at DESC
  `;

  return [
    ...incoming.map((row) => ({
      userId: row.id,
      username: row.username,
      display_name: row.display_name,
      avatar_url: row.avatar_url,
      direction: 'incoming' as const,
      created_at: row.created_at.toISOString(),
    })),
    ...outgoing.map((row) => ({
      userId: row.id,
      username: row.username,
      display_name: row.display_name,
      avatar_url: row.avatar_url,
      direction: 'outgoing' as const,
      created_at: row.created_at.toISOString(),
    })),
  ];
}

export async function getFriendshipStatus(userId: string, targetId: string): Promise<FriendshipStatus> {
  const [row] = await sql<{ status: string }[]>`
    SELECT status FROM friendships
    WHERE user_id = ${userId} AND friend_id = ${targetId}
  `;
  if (row) {
    return row.status === 'accepted' ? 'friends' : 'pending_outgoing';
  }

  // Check reverse direction
  const [reverse] = await sql<{ status: string }[]>`
    SELECT status FROM friendships
    WHERE user_id = ${targetId} AND friend_id = ${userId}
  `;
  if (reverse) {
    return reverse.status === 'accepted' ? 'friends' : 'pending_incoming';
  }

  return 'none';
}
