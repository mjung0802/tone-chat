import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IChannel extends Document {
  serverId: Types.ObjectId;
  name: string;
  type: 'text' | 'voice';
  topic?: string;
  position: number;
}

const channelSchema = new Schema<IChannel>(
  {
    serverId: { type: Schema.Types.ObjectId, ref: 'Server', required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['text', 'voice'], default: 'text' },
    topic: { type: String },
    position: { type: Number, default: 0 },
  },
  { timestamps: true },
);

channelSchema.index({ serverId: 1, position: 1 });

export const Channel = mongoose.model<IChannel>('Channel', channelSchema);
