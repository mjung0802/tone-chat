import type { Request, Response } from 'express';
import { Server } from './server.model.js';

const KEY_PATTERN = /^[a-z0-9]{1,10}$/;
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
const VALID_TEXT_STYLES = ['normal', 'italic', 'medium'] as const;
const VALID_CHARS = ['bounce','tilt','lock','sway','wobble','rise','sink','breathe','jitter'] as const;
const VALID_DRIFT_DIRS = ['UR','U','R','F'] as const;
const MAX_CUSTOM_TONES = 20;

export async function listCustomTones(req: Request, res: Response): Promise<void> {
  const server = await Server.findById(req.params['serverId']);
  if (!server) {
    res.status(404).json({ error: { code: 'SERVER_NOT_FOUND', message: 'Server not found', status: 404 } });
    return;
  }

  res.json({ customTones: server.customTones });
}

export async function addCustomTone(req: Request, res: Response): Promise<void> {
  const server = await Server.findById(req.params['serverId']);
  if (!server) {
    res.status(404).json({ error: { code: 'SERVER_NOT_FOUND', message: 'Server not found', status: 404 } });
    return;
  }

  const { key, label, emoji, colorLight, colorDark, textStyle, char, emojiSet, driftDir, matchEmojis } = req.body as {
    key?: string;
    label?: string;
    emoji?: string;
    colorLight?: string;
    colorDark?: string;
    textStyle?: string;
    char?: string;
    emojiSet?: unknown;
    driftDir?: string;
    matchEmojis?: unknown;
  };

  if (!key || !KEY_PATTERN.test(key)) {
    res.status(400).json({ error: { code: 'INVALID_TONE', message: 'key must match /^[a-z0-9]{1,10}$/', status: 400 } });
    return;
  }

  if (!label || typeof label !== 'string' || label.length < 1 || label.length > 50) {
    res.status(400).json({ error: { code: 'INVALID_TONE', message: 'label is required (1-50 chars)', status: 400 } });
    return;
  }

  if (!emoji || typeof emoji !== 'string' || emoji.length < 1 || emoji.length > 10) {
    res.status(400).json({ error: { code: 'INVALID_TONE', message: 'emoji is required (1-10 chars)', status: 400 } });
    return;
  }

  if (!colorLight || !HEX_COLOR_PATTERN.test(colorLight)) {
    res.status(400).json({ error: { code: 'INVALID_TONE', message: 'colorLight must be a valid hex color', status: 400 } });
    return;
  }

  if (!colorDark || !HEX_COLOR_PATTERN.test(colorDark)) {
    res.status(400).json({ error: { code: 'INVALID_TONE', message: 'colorDark must be a valid hex color', status: 400 } });
    return;
  }

  const resolvedTextStyle = textStyle ?? 'normal';
  if (!(VALID_TEXT_STYLES as readonly string[]).includes(resolvedTextStyle)) {
    res.status(400).json({ error: { code: 'INVALID_TONE', message: 'textStyle must be normal, italic, or medium', status: 400 } });
    return;
  }

  // char: optional, must be one of the 9 enum values if present
  if (char !== undefined && !(VALID_CHARS as readonly string[]).includes(char as string)) {
    res.status(400).json({ error: { code: 'INVALID_TONE', message: 'char must be one of: bounce, tilt, lock, sway, wobble, rise, sink, breathe, jitter', status: 400 } });
    return;
  }

  // emojiSet: optional array of 1-8 strings, each 1-10 chars
  if (emojiSet !== undefined) {
    if (!Array.isArray(emojiSet) || emojiSet.length < 1 || emojiSet.length > 8 || !emojiSet.every((e: unknown) => typeof e === 'string' && e.length >= 1 && e.length <= 10)) {
      res.status(400).json({ error: { code: 'INVALID_TONE', message: 'emojiSet must be an array of 1-8 strings (each 1-10 chars)', status: 400 } });
      return;
    }
  }

  // driftDir: optional, must be one of 'UR', 'U', 'R', 'F' if present
  if (driftDir !== undefined && !(VALID_DRIFT_DIRS as readonly string[]).includes(driftDir as string)) {
    res.status(400).json({ error: { code: 'INVALID_TONE', message: 'driftDir must be one of: UR, U, R, F', status: 400 } });
    return;
  }

  // matchEmojis: optional array of 0-20 strings, each 1-10 chars
  if (matchEmojis !== undefined) {
    if (!Array.isArray(matchEmojis) || matchEmojis.length > 20 || !matchEmojis.every((e: unknown) => typeof e === 'string' && e.length >= 1 && e.length <= 10)) {
      res.status(400).json({ error: { code: 'INVALID_TONE', message: 'matchEmojis must be an array of 0-20 strings (each 1-10 chars)', status: 400 } });
      return;
    }
  }

  if (server.customTones.length >= MAX_CUSTOM_TONES) {
    res.status(400).json({ error: { code: 'MAX_CUSTOM_TONES', message: 'Maximum 20 custom tones per server', status: 400 } });
    return;
  }

  if (server.customTones.some((t) => t.key === key)) {
    res.status(409).json({ error: { code: 'DUPLICATE_TONE_KEY', message: 'A tone with this key already exists', status: 409 } });
    return;
  }

  const newTone = {
    key,
    label,
    emoji,
    colorLight,
    colorDark,
    textStyle: resolvedTextStyle as 'normal' | 'italic' | 'medium',
    ...(char !== undefined && { char: char as 'bounce' | 'tilt' | 'lock' | 'sway' | 'wobble' | 'rise' | 'sink' | 'breathe' | 'jitter' }),
    ...(emojiSet !== undefined && { emojiSet: emojiSet as string[] }),
    ...(driftDir !== undefined && { driftDir: driftDir as 'UR' | 'U' | 'R' | 'F' }),
    ...(matchEmojis !== undefined && { matchEmojis: matchEmojis as string[] }),
  };
  server.customTones.push(newTone);
  await server.save();

  res.status(201).json({ customTone: newTone });
}

export async function removeCustomTone(req: Request, res: Response): Promise<void> {
  const server = await Server.findById(req.params['serverId']);
  if (!server) {
    res.status(404).json({ error: { code: 'SERVER_NOT_FOUND', message: 'Server not found', status: 404 } });
    return;
  }

  const toneKey = req.params['toneKey'] as string;
  const index = server.customTones.findIndex((t) => t.key === toneKey);
  if (index === -1) {
    res.status(404).json({ error: { code: 'TONE_NOT_FOUND', message: 'Tone not found', status: 404 } });
    return;
  }

  server.customTones.splice(index, 1);
  await server.save();

  res.status(204).end();
}
