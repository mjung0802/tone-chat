# Attachment Service
The backend service which controls attachments and files sent through Tone.

This is separate from the messaging service for two reasons:
1. Attachments may require additional processing or time for upload, which should not slow down the message text from sending. The FE can wait for the attachment to resolve while still allowing the users to see the text, then when it resolves users can then consume the attachment
2. If users desire to share the resource beyond the originating server, it can be referenced from the attachments service. However, the messaging Service is server specific, and blending of server specific and agnostic is not best practice.