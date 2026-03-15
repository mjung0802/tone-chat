import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IMessage extends Document {
  channelId: Types.ObjectId;
  serverId: Types.ObjectId;
  authorId: string;
  content: string;
  attachmentIds: string[];
  editedAt?: Date;
  createdAt: Date;
  reactions: { emoji: string; userIds: string[] }[];
  replyTo?: {
    messageId: string;
    authorId: string;
    authorName: string;
    content: string;
  };
  mentions: string[];
}

const messageSchema = new Schema<IMessage>(
  {
    channelId: { type: Schema.Types.ObjectId, ref: 'Channel', required: true },
    serverId: { type: Schema.Types.ObjectId, ref: 'Server', required: true },
    authorId: { type: String, required: true },
    content: { type: String, required: false, default: '' },
    attachmentIds: { type: [String], default: [] },
    editedAt: { type: Date },
    reactions: {
      type: [{ emoji: { type: String, required: true }, userIds: [{ type: String }], _id: false }],
      default: [],
    },
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
  },
  { timestamps: true },
);

messageSchema.index({ channelId: 1, createdAt: -1 });
messageSchema.index({ mentions: 1 });

export const Message = mongoose.model<IMessage>('Message', messageSchema);
