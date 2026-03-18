export type Role = 'member' | 'mod' | 'admin';

const ROLE_HIERARCHY: Record<Role, number> = {
  member: 0,
  mod: 1,
  admin: 2,
};

const OWNER_LEVEL = 3;

export function getRoleLevel(role: Role, isOwner: boolean): number {
  if (isOwner) return OWNER_LEVEL;
  return ROLE_HIERARCHY[role];
}

export function isAbove(
  actorRole: Role,
  actorIsOwner: boolean,
  targetRole: Role,
  targetIsOwner: boolean,
): boolean {
  return getRoleLevel(actorRole, actorIsOwner) > getRoleLevel(targetRole, targetIsOwner);
}
