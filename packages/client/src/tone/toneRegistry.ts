import type {
  CustomToneDefinition,
  CharAnimation,
  DriftDir,
  ToneTextStyle,
} from '../types/models';

export type { CharAnimation, DriftDir, ToneTextStyle } from '../types/models';

export interface ToneDefinition {
  key: string;
  tag: string;
  label: string;
  emoji: string;
  color: { light: string; dark: string };
  textStyle: ToneTextStyle;
  char?: CharAnimation | undefined;
  emojiSet?: string[] | undefined;
  driftDir?: DriftDir | undefined;
  matchEmojis?: string[] | undefined;
}

export const BASE_TONES: ToneDefinition[] = [
  { key: 'j', tag: '/j', label: 'joking', emoji: '😄', color: { light: '#92400e', dark: '#fcd34d' }, textStyle: 'italic', char: 'bounce', emojiSet: ['😂', '✨'], driftDir: 'UR', matchEmojis: ['😂', '🤣'] },
  { key: 's', tag: '/s', label: 'sarcasm', emoji: '🙄', color: { light: '#6b21a8', dark: '#d8b4fe' }, textStyle: 'italic', char: 'tilt', emojiSet: ['🙄', '💭'], matchEmojis: ['🙃', '😒'] },
  { key: 'srs', tag: '/srs', label: 'serious', emoji: '💙', color: { light: '#1e40af', dark: '#bfdbfe' }, textStyle: 'medium', char: 'lock', emojiSet: ['💙'], matchEmojis: ['✋', '💯'] },
  { key: 'lh', tag: '/lh', label: 'lighthearted', emoji: '😊', color: { light: '#92400e', dark: '#fde68a' }, textStyle: 'normal', char: 'sway', emojiSet: ['🌱', '☀️'], driftDir: 'UR', matchEmojis: ['🌱', '☀️'] },
  { key: 'hj', tag: '/hj', label: 'half-joking', emoji: '😏', color: { light: '#92400e', dark: '#fbbf24' }, textStyle: 'italic', char: 'wobble', emojiSet: ['😏', '💭'], driftDir: 'UR', matchEmojis: ['😏', '😬'] },
  { key: 'pos', tag: '/pos', label: 'positive', emoji: '🌟', color: { light: '#166534', dark: '#bbf7d0' }, textStyle: 'normal', char: 'rise', emojiSet: ['🎉', '🌟', '💫'], matchEmojis: ['🎉', '✨'] },
  { key: 'neg', tag: '/neg', label: 'negative', emoji: '😞', color: { light: '#991b1b', dark: '#fca5a5' }, textStyle: 'normal', char: 'sink', emojiSet: ['💧', '😞'], matchEmojis: ['😔', '💀'] },
  { key: 'gen', tag: '/gen', label: 'genuine', emoji: '🤝', color: { light: '#115e59', dark: '#99f6e4' }, textStyle: 'normal', char: 'breathe', emojiSet: ['💗', '🫶'], matchEmojis: ['🤝', '🫶'] },
  { key: 't', tag: '/t', label: 'teasing', emoji: '😜', color: { light: '#9d174d', dark: '#f9a8d4' }, textStyle: 'italic', char: 'jitter', emojiSet: ['😜', '💫'], driftDir: 'UR', matchEmojis: ['😜', '👀'] },
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
    ...(custom.char !== undefined && { char: custom.char }),
    ...(custom.emojiSet !== undefined && { emojiSet: custom.emojiSet }),
    ...(custom.driftDir !== undefined && { driftDir: custom.driftDir }),
    ...(custom.matchEmojis !== undefined && { matchEmojis: custom.matchEmojis }),
  };
}

export function resolveTone(key: string, customTones?: CustomToneDefinition[]): ToneDefinition | undefined {
  const custom = customTones?.find((t) => t.key === key);
  if (custom) {
    return customToneToDefinition(custom);
  }
  return baseToneMap.get(key);
}

export function resolveToneColor(tone: ToneDefinition, isDark: boolean): string {
  return isDark ? tone.color.dark : tone.color.light;
}

export interface ToneTextStyleProps {
  fontStyle?: 'italic';
  fontWeight?: '500';
}

export function toneTextStyleProps(textStyle: ToneTextStyle): ToneTextStyleProps {
  if (textStyle === 'italic') return { fontStyle: 'italic' };
  if (textStyle === 'medium') return { fontWeight: '500' };
  return {};
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
