import { getBaseTone, resolveTone, parseToneTag, customToneToDefinition, resolveToneColor, toneTextStyleProps } from './toneRegistry';
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

  describe('customToneToDefinition', () => {
    it('converts CustomToneDefinition to ToneDefinition', () => {
      const custom: CustomToneDefinition = {
        key: 'chill', label: 'chill', emoji: '😎',
        colorLight: '#1a1a1a', colorDark: '#e0e0e0', textStyle: 'italic',
      };
      const def = customToneToDefinition(custom);
      expect(def).toEqual({
        key: 'chill',
        tag: '/chill',
        label: 'chill',
        emoji: '😎',
        color: { light: '#1a1a1a', dark: '#e0e0e0' },
        textStyle: 'italic',
      });
    });

    it('passes animation fields through when present', () => {
      const custom: CustomToneDefinition = {
        key: 'vibe', label: 'vibe', emoji: '✌️',
        colorLight: '#111111', colorDark: '#eeeeee', textStyle: 'normal',
        char: 'bounce', emojiSet: ['✌️'], matchEmojis: ['✌️'],
      };
      const def = customToneToDefinition(custom);
      expect(def.char).toBe('bounce');
      expect(def.emojiSet).toEqual(['✌️']);
      expect(def.matchEmojis).toEqual(['✌️']);
    });

    it('produces valid ToneDefinition when animation fields absent', () => {
      const custom: CustomToneDefinition = {
        key: 'plain', label: 'plain', emoji: '😐',
        colorLight: '#111111', colorDark: '#eeeeee', textStyle: 'normal',
      };
      const def = customToneToDefinition(custom);
      expect(def.char).toBeUndefined();
      expect(def.emojiSet).toBeUndefined();
      expect(def.matchEmojis).toBeUndefined();
    });
  });

  describe('base tones animation data', () => {
    it('all 9 base tones have char, emojiSet, and matchEmojis populated', () => {
      const keys = ['j', 's', 'srs', 'lh', 'hj', 'pos', 'neg', 'gen', 't'];
      for (const key of keys) {
        const tone = getBaseTone(key);
        expect(tone?.char).toBeDefined();
        expect(tone?.emojiSet).toBeDefined();
        expect(tone?.matchEmojis).toBeDefined();
      }
    });

    it('joking tone has char=bounce', () => {
      const tone = getBaseTone('j');
      expect(tone?.char).toBe('bounce');
      expect(tone?.emojiSet).toEqual(['😂', '✨']);
      expect(tone?.matchEmojis).toEqual(['😂', '🤣']);
    });

    it('negative tone has char=sink', () => {
      const tone = getBaseTone('neg');
      expect(tone?.char).toBe('sink');
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

  describe('resolveToneColor', () => {
    it('returns light color when isDark is false', () => {
      const tone = getBaseTone('j')!;
      expect(resolveToneColor(tone, false)).toBe(tone.color.light);
    });

    it('returns dark color when isDark is true', () => {
      const tone = getBaseTone('j')!;
      expect(resolveToneColor(tone, true)).toBe(tone.color.dark);
    });
  });

  describe('toneTextStyleProps', () => {
    it('returns fontStyle italic for "italic"', () => {
      expect(toneTextStyleProps('italic')).toEqual({ fontStyle: 'italic' });
    });

    it('returns fontWeight 500 for "medium"', () => {
      expect(toneTextStyleProps('medium')).toEqual({ fontWeight: '500' });
    });

    it('returns empty object for "normal"', () => {
      expect(toneTextStyleProps('normal')).toEqual({});
    });
  });
});
