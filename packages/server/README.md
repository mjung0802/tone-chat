# Tone-Chat Server

* Built on Express.js and Socket.IO

The server backend for the client, which will route data to the proper backend services.

Right now there are three main backend services:
- Messaging Service - the primary 'core' service which controls 'servers', messages, channels, and users within 'servers'
- Attachments Service - handles uploaded files and attachments to messages
- Users Service - handles global user accounts