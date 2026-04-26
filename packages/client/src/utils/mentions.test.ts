import { parseMentionSegments } from './mentions';

describe('parseMentionSegments', () => {
  it('returns empty array for empty string', () => {
    expect(parseMentionSegments('')).toEqual([]);
  });

  it('returns single text segment when no mentions present', () => {
    const result = parseMentionSegments('Hello world');
    expect(result).toEqual([{ type: 'text', value: 'Hello world', start: 0 }]);
  });

  it('returns single mention segment for mention-only input', () => {
    const result = parseMentionSegments('@alice');
    expect(result).toEqual([{ type: 'mention', value: '@alice', start: 0 }]);
  });

  it('splits mention at start of text', () => {
    const result = parseMentionSegments('@alice check this');
    expect(result).toEqual([
      { type: 'mention', value: '@alice', start: 0 },
      { type: 'text', value: ' check this', start: 6 },
    ]);
  });

  it('splits mention at end of text', () => {
    const result = parseMentionSegments('Hey @alice');
    expect(result).toEqual([
      { type: 'text', value: 'Hey ', start: 0 },
      { type: 'mention', value: '@alice', start: 4 },
    ]);
  });

  it('splits mention in middle of text', () => {
    const result = parseMentionSegments('Hey @alice how are you');
    expect(result).toEqual([
      { type: 'text', value: 'Hey ', start: 0 },
      { type: 'mention', value: '@alice', start: 4 },
      { type: 'text', value: ' how are you', start: 10 },
    ]);
  });

  it('handles multiple mentions', () => {
    const result = parseMentionSegments('@alice and @bob');
    expect(result).toEqual([
      { type: 'mention', value: '@alice', start: 0 },
      { type: 'text', value: ' and ', start: 6 },
      { type: 'mention', value: '@bob', start: 11 },
    ]);
  });

  it('handles adjacent mentions with no space', () => {
    // Regex matches \w+ so @alice@bob would match @alice and @bob as separate segments
    // only if they are separated by a non-word char — @alice@bob: @alice ends at 'e',
    // next char is '@' which is non-word, so @bob is also a match.
    const result = parseMentionSegments('@alice@bob');
    expect(result).toEqual([
      { type: 'mention', value: '@alice', start: 0 },
      { type: 'mention', value: '@bob', start: 6 },
    ]);
  });

  it('preserves start index for each segment', () => {
    const result = parseMentionSegments('Hi @bob!');
    const mention = result.find((s) => s.type === 'mention');
    expect(mention?.start).toBe(3);
  });
});
