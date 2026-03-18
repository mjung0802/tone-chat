import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IServerMember extends Document {
  serverId: Types.ObjectId;
  userId: string;
  nickname?: string;
  role: 'admin' | 'mod' | 'member';
  mutedUntil: Date | null;
  joinedAt: Date;
}

const serverMemberSchema = new Schema<IServerMember>({
  serverId: { type: Schema.Types.ObjectId, ref: 'Server', required: true },
  userId: { type: String, required: true },
  nickname: { type: String },
  role: { type: String, enum: ['admin', 'mod', 'member'], default: 'member' },
  mutedUntil: { type: Date, default: null },
  joinedAt: { type: Date, default: Date.now },
});

serverMemberSchema.index({ serverId: 1, userId: 1 }, { unique: true });
serverMemberSchema.index({ userId: 1 });

export const ServerMember = mongoose.model<IServerMember>('ServerMember', serverMemberSchema);
