import type { Request, Response } from 'express';
import { createAttachment, getAttachment } from './attachments.service.js';

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
