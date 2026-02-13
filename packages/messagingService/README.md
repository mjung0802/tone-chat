# Messaging Service
The backend service which controls messaging and 'server' data

This is separate from the server, which distributes data to backend services as required. 'Servers' which should probably have a seaparate naming convention, denote the groups of channels or rooms in which users interact.

What this service will control:
- Server metadata including ID, Title, etc.
- Server messages, and all metadata included within them
- Server Channels, including ids, titles, and messages wihtin them, and whether they are read only to non admin users
- Users in the server, and whether they are administrative accounts or not