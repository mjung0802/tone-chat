import mongoose, { Schema, type Document } from 'mongoose';

export interface IServer extends Document {
  name: string;
  ownerId: string;
  icon?: string;
  description?: string;
  visibility: 'public' | 'private';
  customTones: {
    key: string;
    label: string;
    emoji: string;
    colorLight: string;
    colorDark: string;
    textStyle: 'normal' | 'italic' | 'medium';
  }[];
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
    customTones: {
      type: [{
        key: { type: String, required: true },
        label: { type: String, required: true },
        emoji: { type: String, required: true },
        colorLight: { type: String, required: true },
        colorDark: { type: String, required: true },
        textStyle: { type: String, enum: ['normal', 'italic', 'medium'], default: 'normal' },
        _id: false,
      }],
      default: [],
    },
  },
  { timestamps: true },
);

export const Server = mongoose.model<IServer>('Server', serverSchema);
