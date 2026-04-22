import mongoose, { Schema, type Document } from 'mongoose';

export interface IServer extends Document {
  name: string;
  ownerId: string;
  icon?: string;
  description?: string;
  visibility: 'public' | 'private';
  allowMemberInvites: boolean;
  customTones: {
    key: string;
    label: string;
    emoji: string;
    colorLight: string;
    colorDark: string;
    textStyle: 'normal' | 'italic' | 'medium';
    char?: 'bounce' | 'tilt' | 'lock' | 'sway' | 'wobble' | 'rise' | 'sink' | 'breathe' | 'jitter' | undefined;
    emojiSet?: string[] | undefined;
    driftDir?: 'UR' | 'U' | 'R' | 'F' | undefined;
    matchEmojis?: string[] | undefined;
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
    allowMemberInvites: { type: Boolean, default: true },
    customTones: {
      type: [{
        key: { type: String, required: true },
        label: { type: String, required: true },
        emoji: { type: String, required: true },
        colorLight: { type: String, required: true },
        colorDark: { type: String, required: true },
        textStyle: { type: String, enum: ['normal', 'italic', 'medium'], default: 'normal' },
        char: { type: String, enum: ['bounce','tilt','lock','sway','wobble','rise','sink','breathe','jitter'] },
        emojiSet: { type: [String], default: undefined },
        driftDir: { type: String, enum: ['UR','U','R','F'] },
        matchEmojis: { type: [String], default: undefined },
        _id: false,
      }],
      default: [],
    },
  },
  { timestamps: true },
);

export const Server = mongoose.model<IServer>('Server', serverSchema);
