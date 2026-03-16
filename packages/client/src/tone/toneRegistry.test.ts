import { getBaseTone, resolveTone, parseToneTag } from './toneRegistry';
import type { CustomToneDefinition } from '../types/models';

describe('toneRegistry', () => {
  describe('getBaseTone', () => {
    it('returns joking definition for key "j"', () => {
      const tone = getBaseTone('j');
      expect(tone).toBeDefined();
      expect(tone!.label).toBe('joking');
      expect(tone!.emoji).toBe('😄');
    });

    it('returns undefined for unknown key', () => {
      expect(getBaseTone('unknown')).toBeUndefined();
    });
  });

  describe('resolveTone', () => {
    it('prefers custom tone over base when keys match', () => {
      const custom: CustomToneDefinition[] = [
        { key: 'j', label: 'custom-joking', emoji: '🤣', colorLight: '#ff0000', colorDark: '#ff5555', textStyle: 'normal' },
      ];
      const tone = resolveTone('j', custom);
      expect(tone?.label).toBe('custom-joking');
    });

    it('falls back to base when custom has no match', () => {
      const tone = resolveTone('j', []);
      expect(tone?.label).toBe('joking');
    });

    it('returns undefined for unknown key with no custom match', () => {
      expect(resolveTone('zzz')).toBeUndefined();
    });
  });

  describe('parseToneTag', () => {
    it('parses trailing tone tag', () => {
      expect(parseToneTag('hello /j')).toEqual({ cleanContent: 'hello', toneKey: 'j' });
    });

    it('returns null toneKey when no tag present', () => {
      expect(parseToneTag('hello')).toEqual({ cleanContent: 'hello', toneKey: null });
    });

    it('parses standalone tone tag', () => {
      expect(parseToneTag('/s')).toEqual({ cleanContent: '', toneKey: 's' });
    });

    it('does not match mid-content slashes', () => {
      const result = parseToneTag('check http://example.com');
      expect(result.toneKey).toBeNull();
    });

    it('parses multi-char tags', () => {
      expect(parseToneTag('hey /srs')).toEqual({ cleanContent: 'hey', toneKey: 'srs' });
    });
  });
});
