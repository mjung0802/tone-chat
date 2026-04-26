import mongoose, { Schema, type Document } from 'mongoose';
import {
  VALID_CHARS,
  VALID_TEXT_STYLES,
  type CustomToneEntry,
} from './customTones.types.js';

export interface IServer extends Document {
  name: string;
  ownerId: string;
  icon?: string;
  description?: string;
  visibility: 'public' | 'private';
  allowMemberInvites: boolean;
  customTones: CustomToneEntry[];
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
    allowMemberInvites: { type: Boolean, default: true },
    customTones: {
      type: [{
        key: { type: String, required: true },
        label: { type: String, required: true },
        emoji: { type: String, required: true },
        colorLight: { type: String, required: true },
        colorDark: { type: String, required: true },
        textStyle: { type: String, enum: [...VALID_TEXT_STYLES], default: 'normal' },
        char: { type: String, enum: [...VALID_CHARS] },
        emojiSet: { type: [String], default: undefined },
        matchEmojis: { type: [String], default: undefined },
        _id: false,
      }],
      default: [],
    },
  },
  { timestamps: true },
);

export const Server = mongoose.model<IServer>('Server', serverSchema);
