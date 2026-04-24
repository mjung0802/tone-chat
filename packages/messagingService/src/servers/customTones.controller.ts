import type { Request, Response } from 'express';
import { Server } from './server.model.js';
import {
  VALID_CHARS,
  VALID_DRIFT_DIRS,
  VALID_TEXT_STYLES,
  type CharAnimation,
  type CustomToneEntry,
  type DriftDir,
  type ToneTextStyle,
} from './customTones.types.js';

const KEY_PATTERN = /^[a-z0-9]{1,10}$/;
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
const MAX_CUSTOM_TONES = 20;

function bad(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({ error: { code, message, status } });
}

function isValidEnum<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

function isValidStringArray(
  value: unknown,
  minLen: number,
  maxLen: number,
  itemMin: number,
  itemMax: number,
): value is string[] {
  return (
    Array.isArray(value) &&
    value.length >= minLen &&
    value.length <= maxLen &&
    value.every((e) => typeof e === 'string' && e.length >= itemMin && e.length <= itemMax)
  );
}

function parseToneBody(body: unknown, res: Response): CustomToneEntry | null {
  const b = (body ?? {}) as Record<string, unknown>;
  const { key, label, emoji, colorLight, colorDark, textStyle, char, emojiSet, driftDir, matchEmojis } = b;

  if (typeof key !== 'string' || !KEY_PATTERN.test(key)) {
    bad(res, 400, 'INVALID_TONE', 'key must match /^[a-z0-9]{1,10}$/');
    return null;
  }
  if (typeof label !== 'string' || label.length < 1 || label.length > 50) {
    bad(res, 400, 'INVALID_TONE', 'label is required (1-50 chars)');
    return null;
  }
  if (typeof emoji !== 'string' || emoji.length < 1 || emoji.length > 10) {
    bad(res, 400, 'INVALID_TONE', 'emoji is required (1-10 chars)');
    return null;
  }
  if (typeof colorLight !== 'string' || !HEX_COLOR_PATTERN.test(colorLight)) {
    bad(res, 400, 'INVALID_TONE', 'colorLight must be a valid hex color');
    return null;
  }
  if (typeof colorDark !== 'string' || !HEX_COLOR_PATTERN.test(colorDark)) {
    bad(res, 400, 'INVALID_TONE', 'colorDark must be a valid hex color');
    return null;
  }

  const resolvedTextStyle: unknown = textStyle ?? 'normal';
  if (!isValidEnum(resolvedTextStyle, VALID_TEXT_STYLES)) {
    bad(res, 400, 'INVALID_TONE', 'textStyle must be normal, italic, or medium');
    return null;
  }
  const toneTextStyle: ToneTextStyle = resolvedTextStyle;

  let toneChar: CharAnimation | undefined;
  if (char !== undefined) {
    if (!isValidEnum(char, VALID_CHARS)) {
      bad(res, 400, 'INVALID_TONE', 'char must be one of: bounce, tilt, lock, sway, wobble, rise, sink, breathe, jitter');
      return null;
    }
    toneChar = char;
  }

  let toneEmojiSet: string[] | undefined;
  if (emojiSet !== undefined) {
    if (!isValidStringArray(emojiSet, 1, 8, 1, 10)) {
      bad(res, 400, 'INVALID_TONE', 'emojiSet must be an array of 1-8 strings (each 1-10 chars)');
      return null;
    }
    toneEmojiSet = emojiSet;
  }

  let toneDriftDir: DriftDir | undefined;
  if (driftDir !== undefined) {
    if (!isValidEnum(driftDir, VALID_DRIFT_DIRS)) {
      bad(res, 400, 'INVALID_TONE', 'driftDir must be one of: UL, UR, DL, DR');
      return null;
    }
    toneDriftDir = driftDir;
  }

  let toneMatchEmojis: string[] | undefined;
  if (matchEmojis !== undefined) {
    if (!isValidStringArray(matchEmojis, 0, 20, 1, 10)) {
      bad(res, 400, 'INVALID_TONE', 'matchEmojis must be an array of 0-20 strings (each 1-10 chars)');
      return null;
    }
    toneMatchEmojis = matchEmojis;
  }

  return {
    key,
    label,
    emoji,
    colorLight,
    colorDark,
    textStyle: toneTextStyle,
    ...(toneChar !== undefined && { char: toneChar }),
    ...(toneEmojiSet !== undefined && { emojiSet: toneEmojiSet }),
    ...(toneDriftDir !== undefined && { driftDir: toneDriftDir }),
    ...(toneMatchEmojis !== undefined && { matchEmojis: toneMatchEmojis }),
  };
}

export async function listCustomTones(req: Request, res: Response): Promise<void> {
  const server = await Server.findById(req.params['serverId'], 'customTones').lean();
  if (!server) {
    bad(res, 404, 'SERVER_NOT_FOUND', 'Server not found');
    return;
  }
  res.json({ customTones: server.customTones });
}

export async function addCustomTone(req: Request, res: Response): Promise<void> {
  const serverId = req.params['serverId'];
  const tone = parseToneBody(req.body, res);
  if (!tone) return;

  const result = await Server.updateOne(
    {
      _id: serverId,
      'customTones.key': { $ne: tone.key },
      $expr: { $lt: [{ $size: '$customTones' }, MAX_CUSTOM_TONES] },
    },
    { $push: { customTones: tone } },
  );

  if (result.matchedCount === 0) {
    const existing = await Server.findById(serverId, 'customTones').lean();
    if (!existing) {
      bad(res, 404, 'SERVER_NOT_FOUND', 'Server not found');
      return;
    }
    if (existing.customTones.some((t) => t.key === tone.key)) {
      bad(res, 409, 'DUPLICATE_TONE_KEY', 'A tone with this key already exists');
      return;
    }
    if (existing.customTones.length >= MAX_CUSTOM_TONES) {
      bad(res, 400, 'MAX_CUSTOM_TONES', 'Maximum 20 custom tones per server');
      return;
    }
    bad(res, 400, 'INVALID_TONE', 'Unable to add tone');
    return;
  }

  res.status(201).json({ customTone: tone });
}

export async function removeCustomTone(req: Request, res: Response): Promise<void> {
  const serverId = req.params['serverId'];
  const toneKey = req.params['toneKey'] as string;

  const result = await Server.updateOne(
    { _id: serverId, 'customTones.key': toneKey },
    { $pull: { customTones: { key: toneKey } } },
  );

  if (result.matchedCount === 0) {
    const exists = await Server.exists({ _id: serverId });
    if (!exists) {
      bad(res, 404, 'SERVER_NOT_FOUND', 'Server not found');
      return;
    }
    bad(res, 404, 'TONE_NOT_FOUND', 'Tone not found');
    return;
  }

  res.status(204).end();
}
