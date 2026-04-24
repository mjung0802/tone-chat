export const VALID_TEXT_STYLES = ['normal', 'italic', 'medium'] as const;
export const VALID_CHARS = [
  'bounce',
  'tilt',
  'lock',
  'sway',
  'wobble',
  'rise',
  'sink',
  'breathe',
  'jitter',
] as const;
export const VALID_DRIFT_DIRS = ['UR', 'U', 'R', 'F'] as const;

export type ToneTextStyle = (typeof VALID_TEXT_STYLES)[number];
export type CharAnimation = (typeof VALID_CHARS)[number];
export type DriftDir = (typeof VALID_DRIFT_DIRS)[number];

export interface CustomToneEntry {
  key: string;
  label: string;
  emoji: string;
  colorLight: string;
  colorDark: string;
  textStyle: ToneTextStyle;
  char?: CharAnimation | undefined;
  emojiSet?: string[] | undefined;
  driftDir?: DriftDir | undefined;
  matchEmojis?: string[] | undefined;
}
