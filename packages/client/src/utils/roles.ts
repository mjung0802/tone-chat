export type Role = 'member' | 'mod' | 'admin';

const ROLE_HIERARCHY: Record<Role, number> = {
  member: 0,
  mod: 1,
  admin: 2,
};

const OWNER_LEVEL = 3;

export function getRoleLevel(role: Role, isOwner: boolean): number {
  if (isOwner) return OWNER_LEVEL;
  return ROLE_HIERARCHY[role] ?? 0;
}

export function isAbove(
  actorRole: Role,
  actorIsOwner: boolean,
  targetRole: Role,
  targetIsOwner: boolean,
): boolean {
  return getRoleLevel(actorRole, actorIsOwner) > getRoleLevel(targetRole, targetIsOwner);
}

export interface AvailableActions {
  canMute: boolean;
  canKick: boolean;
  canBan: boolean;
  canPromote: boolean;
  canDemote: boolean;
  canTransferOwnership: boolean;
}

export function isMemberMuted(mutedUntil?: string): boolean {
  return mutedUntil ? new Date(mutedUntil) > new Date() : false;
}

export function getAvailableActions(
  actorRole: Role,
  actorIsOwner: boolean,
  targetRole: Role,
  targetIsOwner: boolean,
): AvailableActions {
  const actorLevel = getRoleLevel(actorRole, actorIsOwner);
  const above = isAbove(actorRole, actorIsOwner, targetRole, targetIsOwner);
  const isMod = actorLevel >= getRoleLevel('mod', false);
  const isAdmin = actorLevel >= getRoleLevel('admin', false);

  return {
    canMute: isMod && above,
    canKick: isMod && above,
    canBan: isMod && above,
    canPromote: above && (
      (targetRole === 'member' && isAdmin) ||
      (targetRole === 'mod' && actorIsOwner)
    ),
    canDemote: above && (
      (targetRole === 'admin' && actorIsOwner) ||
      (targetRole === 'mod' && isAdmin)
    ),
    canTransferOwnership: actorIsOwner && targetRole === 'admin' && !targetIsOwner,
  };
}
