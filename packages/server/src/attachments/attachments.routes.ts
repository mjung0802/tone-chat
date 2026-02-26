import { Router } from 'express';
import type { AuthRequest } from '../shared/middleware/auth.js';
import { uploadAttachment, getAttachment } from './attachments.client.js';

export const attachmentsRouter = Router();

attachmentsRouter.post('/upload', async (req: AuthRequest, res) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  const body = Buffer.concat(chunks);
  const contentType = req.headers['content-type'] ?? 'application/octet-stream';
  const filename = (req.query['filename'] as string) ?? 'upload';

  const result = await uploadAttachment(req.userId!, body, contentType, filename);
  res.status(result.status).json(result.data);
});

attachmentsRouter.get('/:attachmentId', async (req: AuthRequest, res) => {
  const result = await getAttachment(req.userId!, req.params['attachmentId'] as string);
  res.status(result.status).json(result.data);
});
