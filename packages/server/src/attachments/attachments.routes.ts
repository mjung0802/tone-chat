import { Router } from 'express';
import type { AuthRequest } from '../shared/middleware/auth.js';
import { deleteAttachment, getAttachment, getPublicAttachment, uploadAttachment } from './attachments.client.js';

export const attachmentsRouter = Router();
export const attachmentsPublicRouter = Router();

attachmentsPublicRouter.get('/:token', async (req, res) => {
  const result = await getPublicAttachment(req.params['token'] as string);
  if (result.status !== 200 || !result.body) {
    res.sendStatus(result.status);
    return;
  }

  res.setHeader('Content-Type', result.contentType ?? 'application/octet-stream');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.status(200).send(result.body);
});

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

attachmentsRouter.delete('/:attachmentId', async (req: AuthRequest, res) => {
  const result = await deleteAttachment(req.userId!, req.params['attachmentId'] as string);
  if (result.status === 204) {
    res.status(204).send();
    return;
  }
  res.status(result.status).json(result.data);
});
