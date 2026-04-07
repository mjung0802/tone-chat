import { Router } from 'express';
import { deleteFile, getFile, uploadFile } from './attachments.controller.js';
import { upload } from './upload.middleware.js';

export const attachmentsRouter = Router();

attachmentsRouter.post('/upload', upload.single('file'), uploadFile);
attachmentsRouter.get('/:attachmentId', getFile);
attachmentsRouter.delete('/:attachmentId', deleteFile);
