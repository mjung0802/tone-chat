import { Router } from 'express';
import { getMe, patchMe, getUser } from './users.controller.js';

export const usersRouter = Router();

usersRouter.get('/me', getMe);
usersRouter.patch('/me', patchMe);
usersRouter.get('/:id', getUser);
