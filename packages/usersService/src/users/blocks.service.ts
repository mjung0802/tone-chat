import { sql } from '../config/database.js';
import { AppError } from '../shared/middleware/errorHandler.js';

export async function blockUser(blockerId: string, blockedId: string): Promise<void> {
  await sql`
    INSERT INTO user_blocks (blocker_id, blocked_id)
    VALUES (${blockerId}, ${blockedId})
    ON CONFLICT DO NOTHING
  `;
}

export async function unblockUser(blockerId: string, blockedId: string): Promise<void> {
  const result = await sql`
    DELETE FROM user_blocks
    WHERE blocker_id = ${blockerId} AND blocked_id = ${blockedId}
    RETURNING blocker_id
  `;
  if (result.length === 0) {
    throw new AppError('NOT_FOUND', 'Block not found', 404);
  }
}

export async function getBlockedIds(userId: string): Promise<string[]> {
  const rows = await sql<{ blocked_id: string }[]>`
    SELECT blocked_id FROM user_blocks WHERE blocker_id = ${userId}
  `;
  return rows.map((row) => row.blocked_id);
}

export async function isBlockedBy(viewerId: string, targetId: string): Promise<boolean> {
  const rows = await sql<{ blocker_id: string }[]>`
    SELECT blocker_id FROM user_blocks
    WHERE blocker_id = ${targetId} AND blocked_id = ${viewerId}
    LIMIT 1
  `;
  return rows.length > 0;
}
