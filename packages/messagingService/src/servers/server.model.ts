import mongoose, { Schema, type Document } from 'mongoose';

export interface IServer extends Document {
  name: string;
  ownerId: string;
  icon?: string;
  description?: string;
  visibility: 'public' | 'private';
  createdAt: Date;
  updatedAt: Date;
}

const serverSchema = new Schema<IServer>(
  {
    name: { type: String, required: true },
    ownerId: { type: String, required: true },
    icon: { type: String },
    description: { type: String },
    visibility: { type: String, enum: ['public', 'private'], default: 'private' },
  },
  { timestamps: true },
);

export const Server = mongoose.model<IServer>('Server', serverSchema);
