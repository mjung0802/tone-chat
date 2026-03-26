# types/

- **models.ts** — `User`, `Server`, `Channel`, `Message`, `CustomToneDefinition`, `ServerMember`, `ServerBan`, `Invite`, `Attachment`, `DirectConversation`, `DirectMessage` interfaces
- **api.types.ts** — request types (RegisterRequest, LoginRequest, SendDmRequest, UpdateDmRequest, ToggleDmReactionRequest, etc.), response wrappers (AuthResponse, RefreshResponse, DirectConversationResponse, DirectConversationsResponse, DirectMessageResponse, DirectMessagesResponse, BlockedIdsResponse, etc.), query/filter types (MessagesQuery, etc.)
- **socket.types.ts** — `JoinChannelPayload`, `SendMessagePayload`, `DmSendPayload`, etc.; `ClientToServerEvents` (includes `join_dm`, `leave_dm`, `dm:send`, `dm:typing`, `dm:react`), `ServerToClientEvents` (includes `dm:new_message`, `dm:typing`, `dm:reaction_updated`, `dm:notification`) typed event maps
