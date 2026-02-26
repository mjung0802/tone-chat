import mongoose, { Schema, type Document, type Types } from 'mongoose';
import crypto from 'node:crypto';

export interface IInvite extends Document {
  serverId: Types.ObjectId;
  code: string;
  createdBy: string;
  maxUses?: number;
  uses: number;
  expiresAt?: Date;
  revoked: boolean;
  createdAt: Date;
}

const inviteSchema = new Schema<IInvite>(
  {
    serverId: { type: Schema.Types.ObjectId, ref: 'Server', required: true },
    code: {
      type: String,
      required: true,
      unique: true,
      default: () => crypto.randomBytes(9).toString('base64url'),
    },
    createdBy: { type: String, required: true },
    maxUses: { type: Number },
    uses: { type: Number, default: 0 },
    expiresAt: { type: Date },
    revoked: { type: Boolean, default: false },
  },
  { timestamps: true },
);

inviteSchema.index({ serverId: 1 });
inviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Invite = mongoose.model<IInvite>('Invite', inviteSchema);
