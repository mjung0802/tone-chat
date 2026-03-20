import { Router } from 'express';
import { createUser, getMe, getUser, getUsersBatch, patchMe } from './users.controller.js';

export const usersRouter = Router();

//users
usersRouter.post('/batch', getUsersBatch);

//user
usersRouter.get('/:id', getUser);
usersRouter.post('/', createUser);

//me
usersRouter.get('/me', getMe);
usersRouter.patch('/me', patchMe);
