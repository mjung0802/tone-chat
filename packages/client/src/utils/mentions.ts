export interface TextSegment {
  type: 'text';
  value: string;
  start: number;
}

export interface MentionSegment {
  type: 'mention';
  value: string;
  start: number;
}

export type MentionTokenSegment = TextSegment | MentionSegment;

export function parseMentionSegments(text: string): MentionTokenSegment[] {
  const segments: MentionTokenSegment[] = [];
  const regex = /@\w+/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        value: text.slice(lastIndex, match.index),
        start: lastIndex,
      });
    }
    segments.push({ type: 'mention', value: match[0], start: match.index });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex), start: lastIndex });
  }

  return segments;
}
