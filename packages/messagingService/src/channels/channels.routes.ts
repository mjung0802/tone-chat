import { Router } from 'express';
import { createChannel, listChannels, getChannel, updateChannel, deleteChannel } from './channels.controller.js';

export const channelsRouter = Router({ mergeParams: true });

channelsRouter.post('/', createChannel);
channelsRouter.get('/', listChannels);
channelsRouter.get('/:channelId', getChannel);
channelsRouter.patch('/:channelId', updateChannel);
channelsRouter.delete('/:channelId', deleteChannel);
