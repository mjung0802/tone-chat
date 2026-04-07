import type { Request, Response } from 'express';
import { createAttachment, deleteAttachment, getAttachment, getPublicLocalAttachment } from './attachments.service.js';
import { readLocalStorageObject } from './storage.service.js';

export async function uploadFile(req: Request, res: Response): Promise<void> {
  const userId = req.headers['x-user-id'] as string;
  const file = req.file;

  if (!file) {
    res.status(400).json({ error: { code: 'NO_FILE', message: 'No file uploaded', status: 400 } });
    return;
  }

  const attachment = await createAttachment(userId, file);
  res.status(201).json({ attachment });
}

export async function getFile(req: Request, res: Response): Promise<void> {
  const attachment = await getAttachment(req.params['attachmentId'] as string);
  res.json({ attachment });
}

export async function deleteFile(req: Request, res: Response): Promise<void> {
  const userId = req.headers['x-user-id'] as string;
  const attachmentId = req.params['attachmentId'] as string;

  await deleteAttachment(attachmentId, userId);
  res.status(204).send();
}

export async function getPublicFile(req: Request, res: Response): Promise<void> {
  const token = req.params['token'] as string;
  const attachment = await getPublicLocalAttachment(token);
  const file = await readLocalStorageObject(attachment.storage_key);

  res.setHeader('Content-Type', attachment.mime_type);
  res.setHeader('Content-Disposition', `inline; filename="${attachment.filename}"`);
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.send(file);
}
