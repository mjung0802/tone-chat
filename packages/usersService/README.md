# Users Service
The backend service which controls global User accounts. This is separate from the messaging service so that users do not need to create new accounts for every 'server' they wish to join. 

Keeping users server agnostic allows for global account deletion, as well as global moderation. Given this is a server agnostic requirement, a service separate from messaging service is required. Whether server specific management should be through usersService should be discussed, as there is a users table that will be in the server db, and likely must be managed by messagingService.