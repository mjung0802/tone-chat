import { getRoleLevel, isAbove, getAvailableActions } from './roles';

describe('getRoleLevel', () => {
  it('returns correct levels', () => {
    expect(getRoleLevel('member', false)).toBe(0);
    expect(getRoleLevel('mod', false)).toBe(1);
    expect(getRoleLevel('admin', false)).toBe(2);
    expect(getRoleLevel('member', true)).toBe(3);
  });
});

describe('isAbove', () => {
  it('admin is above member', () => {
    expect(isAbove('admin', false, 'member', false)).toBe(true);
  });

  it('member is not above admin', () => {
    expect(isAbove('member', false, 'admin', false)).toBe(false);
  });

  it('owner is above admin', () => {
    expect(isAbove('admin', true, 'admin', false)).toBe(true);
  });
});

describe('getAvailableActions', () => {
  it('owner can do everything to a member', () => {
    const actions = getAvailableActions('admin', true, 'member', false);
    expect(actions.canMute).toBe(true);
    expect(actions.canKick).toBe(true);
    expect(actions.canBan).toBe(true);
    expect(actions.canPromote).toBe(true);
    expect(actions.canDemote).toBe(false); // can't demote below member
  });

  it('owner can promote mod to admin', () => {
    const actions = getAvailableActions('admin', true, 'mod', false);
    expect(actions.canPromote).toBe(true);
  });

  it('owner can demote admin to mod', () => {
    const actions = getAvailableActions('admin', true, 'admin', false);
    expect(actions.canDemote).toBe(true);
    expect(actions.canTransferOwnership).toBe(true);
  });

  it('admin can moderate member but not promote to admin', () => {
    const actions = getAvailableActions('admin', false, 'member', false);
    expect(actions.canMute).toBe(true);
    expect(actions.canKick).toBe(true);
    expect(actions.canBan).toBe(true);
    expect(actions.canPromote).toBe(true); // member → mod
    expect(actions.canTransferOwnership).toBe(false);
  });

  it('mod can moderate member', () => {
    const actions = getAvailableActions('mod', false, 'member', false);
    expect(actions.canMute).toBe(true);
    expect(actions.canKick).toBe(true);
    expect(actions.canBan).toBe(true);
    expect(actions.canPromote).toBe(false); // mod can't promote
    expect(actions.canDemote).toBe(false);
  });

  it('mod cannot moderate admin', () => {
    const actions = getAvailableActions('mod', false, 'admin', false);
    expect(actions.canMute).toBe(false);
    expect(actions.canKick).toBe(false);
    expect(actions.canBan).toBe(false);
  });

  it('member has no moderation powers', () => {
    const actions = getAvailableActions('member', false, 'member', false);
    expect(actions.canMute).toBe(false);
    expect(actions.canKick).toBe(false);
    expect(actions.canBan).toBe(false);
    expect(actions.canPromote).toBe(false);
    expect(actions.canDemote).toBe(false);
    expect(actions.canTransferOwnership).toBe(false);
  });
});
