import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type AuditAction = 'mute' | 'unmute' | 'kick' | 'ban' | 'unban' | 'promote' | 'demote';

export interface IAuditLog extends Document {
  serverId: Types.ObjectId;
  action: AuditAction;
  actorId: string;
  targetId: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>({
  serverId: { type: Schema.Types.ObjectId, ref: 'Server', required: true },
  action: { type: String, enum: ['mute', 'unmute', 'kick', 'ban', 'unban', 'promote', 'demote'], required: true },
  actorId: { type: String, required: true },
  targetId: { type: String, required: true },
  metadata: { type: Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now },
});

auditLogSchema.index({ serverId: 1, createdAt: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);

export function logAuditEvent(
  serverId: string,
  action: AuditAction,
  actorId: string,
  targetId: string,
  metadata: Record<string, unknown> = {},
): Promise<IAuditLog> {
  return AuditLog.create({ serverId, action, actorId, targetId, metadata });
}
