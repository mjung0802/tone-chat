import { Router } from 'express';
import { createChannel, listChannels, getChannel, updateChannel, deleteChannel } from './channels.controller.js';
import { requireMember } from '../shared/middleware/requireMember.js';
import { requireAdmin } from '../shared/middleware/requireAdmin.js';

export const channelsRouter = Router({ mergeParams: true });

channelsRouter.post('/', requireMember, createChannel);
channelsRouter.get('/', requireMember, listChannels);
channelsRouter.get('/:channelId', requireMember, getChannel);
channelsRouter.patch('/:channelId', requireAdmin, updateChannel);
channelsRouter.delete('/:channelId', requireAdmin, deleteChannel);
