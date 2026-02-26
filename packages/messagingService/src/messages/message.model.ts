import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IMessage extends Document {
  channelId: Types.ObjectId;
  serverId: Types.ObjectId;
  authorId: string;
  content: string;
  attachmentIds: string[];
  editedAt?: Date;
  createdAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    channelId: { type: Schema.Types.ObjectId, ref: 'Channel', required: true },
    serverId: { type: Schema.Types.ObjectId, ref: 'Server', required: true },
    authorId: { type: String, required: true },
    content: { type: String, required: true },
    attachmentIds: { type: [String], default: [] },
    editedAt: { type: Date },
  },
  { timestamps: true },
);

messageSchema.index({ channelId: 1, createdAt: -1 });

export const Message = mongoose.model<IMessage>('Message', messageSchema);
