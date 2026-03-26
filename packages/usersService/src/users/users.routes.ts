import { Router } from 'express';
import { getMe, patchMe, getUser, getUsersBatch } from './users.controller.js';
import { postBlock, deleteBlock, listBlocks } from './blocks.controller.js';

export const usersRouter = Router();

usersRouter.get('/me', getMe);
usersRouter.patch('/me', patchMe);
usersRouter.get('/me/blocks', listBlocks);
usersRouter.post('/me/blocks/:userId', postBlock);
usersRouter.delete('/me/blocks/:userId', deleteBlock);
usersRouter.post('/batch', getUsersBatch);
usersRouter.get('/:id', getUser);
