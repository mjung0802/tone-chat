import path from 'node:path';
import { sql } from '../config/database.js';
import { uploadToS3, getPresignedUrl } from './storage.service.js';
import { AppError } from '../shared/middleware/errorHandler.js';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

function sanitizeFilename(name: string): string {
  // Extract basename to strip path traversal, then remove control characters
  const base = path.basename(name);
  return base.replace(/[\x00-\x1f\x7f]/g, '');
}

interface Attachment {
  id: string;
  uploader_id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  storage_key: string;
  status: string;
  url: string | null;
  created_at: Date;
}

export async function createAttachment(
  uploaderId: string,
  file: { buffer: Buffer; mimetype: string; originalname: string; size: number },
): Promise<Attachment> {
  if (file.size > MAX_FILE_SIZE) {
    throw new AppError('FILE_TOO_LARGE', 'File exceeds maximum size of 25MB', 413);
  }

  // Insert metadata with processing status
  const [attachment] = await sql<Attachment[]>`
    INSERT INTO attachments (uploader_id, filename, mime_type, size_bytes, storage_key, status)
    VALUES (${uploaderId}, ${sanitizeFilename(file.originalname)}, ${file.mimetype}, ${file.size}, ${'pending'}, ${'processing'})
    RETURNING *
  `;

  try {
    const storageKey = await uploadToS3(file);
    const url = await getPresignedUrl(storageKey);

    const [updated] = await sql<Attachment[]>`
      UPDATE attachments SET storage_key = ${storageKey}, status = 'ready', url = ${url}
      WHERE id = ${attachment!.id} RETURNING *
    `;
    return updated!;
  } catch (err) {
    await sql`UPDATE attachments SET status = 'failed' WHERE id = ${attachment!.id}`;
    throw err;
  }
}

export async function getAttachment(id: string): Promise<Attachment> {
  const [attachment] = await sql<Attachment[]>`SELECT * FROM attachments WHERE id = ${id}`;
  if (!attachment) {
    throw new AppError('ATTACHMENT_NOT_FOUND', 'Attachment not found', 404);
  }
  if (attachment.status === 'ready' && attachment.storage_key && attachment.storage_key !== 'pending') {
    attachment.url = await getPresignedUrl(attachment.storage_key);
  }
  return attachment;
}
