import type { CustomToneDefinition } from '../types/models';

export interface ToneDefinition {
  key: string;
  tag: string;
  label: string;
  emoji: string;
  color: { light: string; dark: string };
  textStyle: 'normal' | 'italic' | 'medium';
}

export const BASE_TONES: ToneDefinition[] = [
  { key: 'j', tag: '/j', label: 'joking', emoji: '😄', color: { light: '#92400e', dark: '#fcd34d' }, textStyle: 'italic' },
  { key: 's', tag: '/s', label: 'sarcasm', emoji: '🙄', color: { light: '#6b21a8', dark: '#d8b4fe' }, textStyle: 'italic' },
  { key: 'srs', tag: '/srs', label: 'serious', emoji: '💙', color: { light: '#1e40af', dark: '#bfdbfe' }, textStyle: 'medium' },
  { key: 'lh', tag: '/lh', label: 'lighthearted', emoji: '😊', color: { light: '#92400e', dark: '#fde68a' }, textStyle: 'normal' },
  { key: 'hj', tag: '/hj', label: 'half-joking', emoji: '😏', color: { light: '#92400e', dark: '#fbbf24' }, textStyle: 'italic' },
  { key: 'pos', tag: '/pos', label: 'positive', emoji: '🌟', color: { light: '#166534', dark: '#bbf7d0' }, textStyle: 'normal' },
  { key: 'neg', tag: '/neg', label: 'negative', emoji: '😞', color: { light: '#991b1b', dark: '#fca5a5' }, textStyle: 'normal' },
  { key: 'gen', tag: '/gen', label: 'genuine', emoji: '🤝', color: { light: '#115e59', dark: '#99f6e4' }, textStyle: 'normal' },
  { key: 't', tag: '/t', label: 'teasing', emoji: '😜', color: { light: '#9d174d', dark: '#f9a8d4' }, textStyle: 'italic' },
];

const baseToneMap = new Map(BASE_TONES.map((t) => [t.key, t]));

export function getBaseTone(key: string): ToneDefinition | undefined {
  return baseToneMap.get(key);
}

export function customToneToDefinition(custom: CustomToneDefinition): ToneDefinition {
  return {
    key: custom.key,
    tag: `/${custom.key}`,
    label: custom.label,
    emoji: custom.emoji,
    color: { light: custom.colorLight, dark: custom.colorDark },
    textStyle: custom.textStyle,
  };
}

export function resolveTone(key: string, customTones?: CustomToneDefinition[]): ToneDefinition | undefined {
  const custom = customTones?.find((t) => t.key === key);
  if (custom) {
    return customToneToDefinition(custom);
  }
  return baseToneMap.get(key);
}

const TONE_TAG_REGEX = /(?:^|\s)\/([a-zA-Z]{1,10})$/;

export function parseToneTag(content: string): { cleanContent: string; toneKey: string | null } {
  const match = TONE_TAG_REGEX.exec(content);
  if (!match || match[1] === undefined) {
    return { cleanContent: content, toneKey: null };
  }
  const toneKey = match[1].toLowerCase();
  const cleanContent = content.slice(0, match.index).trim();
  return { cleanContent, toneKey };
}
