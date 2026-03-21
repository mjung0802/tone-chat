# hooks/

- **useMessages.ts** — `useMessages()` (useInfiniteQuery, cursor pagination, 50/page), `useSendMessage()`, `useEditMessage()`, `injectMessage()`, `updateMessageInCache()`
- **useSocket.ts** — `useSocketConnection()` (lifecycle), `useChannelSocket()` (join/leave rooms + cache injection), `useTypingEmit()` (2s debounce)
- **useAuth.ts** — `useLogin()`, `useRegister()`, `useLogout()`, `useVerifyEmail()`, `useResendVerification()` — success handlers set tokens + connect socket
- **useServers.ts** — `useServers()`, `useServer()`, `useCreateServer()`, `useUpdateServer()`, `useDeleteServer()`, `useTransferOwnership()`
- **useChannels.ts** — `useChannels()`, `useChannel()`, `useCreateChannel()`, `useUpdateChannel()`, `useDeleteChannel()`
- **useMembers.ts** — `useMembers()`, `useMember()`, `useJoinServer()`, `useUpdateMember()`, `useRemoveMember()`, `useKickMember()`, `useMuteMember()`, `useUnmuteMember()`, `usePromoteMember()`, `useDemoteMember()`, `useBanMember()`
- **useBans.ts** — `useBans()`, `useUnban()`
- **useInvites.ts** — `useInvites()`, `useCreateInvite()`, `useRevokeInvite()`, `useJoinViaCode()`
- **useAttachments.ts** — `useUpload()` (mutation), `useAttachment()` (staleTime: Infinity)
- **useTones.ts** — `useCustomTones()`, `useAddCustomTone()`, `useRemoveCustomTone()`
- **useUser.ts** — `useMe()`, `useUser()`, `useUpdateProfile()`
- **useMentionNotifications.ts** — listens for `mention` socket events; suppresses if viewing that channel; shows system or in-app notification
- **useAuth.test.ts** / **useMessages.test.ts** / **useSocket.test.ts** / **useAttachments.test.ts** / **useMentionNotifications.test.ts** — unit tests
