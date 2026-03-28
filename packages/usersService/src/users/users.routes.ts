import { Router } from 'express';
import { getMe, patchMe, getUser, getUsersBatch } from './users.controller.js';
import { postBlock, deleteBlock, listBlocks } from './blocks.controller.js';
import {
  postFriendRequest,
  patchAcceptRequest,
  deleteFriend,
  listFriends,
  listPendingRequests,
  getFriendshipStatus,
} from './friends.controller.js';

export const usersRouter = Router();

usersRouter.get('/me', getMe);
usersRouter.patch('/me', patchMe);
usersRouter.get('/me/blocks', listBlocks);
usersRouter.post('/me/blocks/:userId', postBlock);
usersRouter.delete('/me/blocks/:userId', deleteBlock);
usersRouter.get('/me/friends', listFriends);
usersRouter.get('/me/friends/pending', listPendingRequests);
usersRouter.get('/me/friends/:userId/status', getFriendshipStatus);
usersRouter.post('/me/friends/:userId', postFriendRequest);
usersRouter.patch('/me/friends/:userId/accept', patchAcceptRequest);
usersRouter.delete('/me/friends/:userId', deleteFriend);
usersRouter.post('/batch', getUsersBatch);
usersRouter.get('/:id', getUser);
