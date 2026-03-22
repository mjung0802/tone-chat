import mongoose, { Schema, type Document } from 'mongoose';

export interface IDirectConversation extends Document {
  participantIds: [string, string];
  lastMessageAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const directConversationSchema = new Schema<IDirectConversation>(
  {
    participantIds: { type: [String], required: true },
    lastMessageAt: { type: Date, default: null },
  },
  { timestamps: true },
);

directConversationSchema.index({ 'participantIds.0': 1, 'participantIds.1': 1 }, { unique: true });
directConversationSchema.index({ participantIds: 1, lastMessageAt: -1 });

export const DirectConversation = mongoose.model<IDirectConversation>(
  'DirectConversation',
  directConversationSchema,
);
