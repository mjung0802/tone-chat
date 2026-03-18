import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IServerBan extends Document {
  serverId: Types.ObjectId;
  userId: string;
  reason?: string;
  bannedBy: string;
  bannedAt: Date;
}

const serverBanSchema = new Schema<IServerBan>({
  serverId: { type: Schema.Types.ObjectId, ref: 'Server', required: true },
  userId: { type: String, required: true },
  reason: { type: String },
  bannedBy: { type: String, required: true },
  bannedAt: { type: Date, default: Date.now },
});

serverBanSchema.index({ serverId: 1, userId: 1 }, { unique: true });

export const ServerBan = mongoose.model<IServerBan>('ServerBan', serverBanSchema);
