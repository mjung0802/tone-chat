import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IDirectMessage extends Document {
  conversationId: Types.ObjectId;
  authorId: string;
  content: string | null;
  attachmentIds: string[];
  replyTo?: {
    messageId: string;
    authorId: string;
    authorName: string;
    content: string;
  };
  mentions: string[];
  reactions: { emoji: string; userIds: string[] }[];
  tone: string | null;
  editedAt: Date | null;
  createdAt: Date;
}

const directMessageSchema = new Schema<IDirectMessage>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'DirectConversation', required: true },
    authorId: { type: String, required: true },
    content: { type: String, default: null },
    attachmentIds: { type: [String], default: [] },
    replyTo: {
      type: {
        messageId: { type: String, required: true },
        authorId: { type: String, required: true },
        authorName: { type: String, required: true },
        content: { type: String, required: true },
      },
      _id: false,
    },
    mentions: { type: [String], default: [] },
    reactions: {
      type: [{ emoji: { type: String, required: true }, userIds: [{ type: String }], _id: false }],
      default: [],
    },
    tone: { type: String, default: null },
    editedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

directMessageSchema.index({ conversationId: 1, createdAt: -1 });
directMessageSchema.index({ mentions: 1 });

export const DirectMessage = mongoose.model<IDirectMessage>('DirectMessage', directMessageSchema);
