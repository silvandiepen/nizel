import { defineNizelPlugin, type NizelPlugin } from 'nizel';

export type EmojiMap = Record<string, string>;

export type EmojiPluginOptions = {
  emojiMap?: EmojiMap;
};

/**
 * Built-in emoji shortcut names.
 */
export const DEFAULT_EMOJI_MAP: EmojiMap = {
  smile: '\u{1F604}',
  laughing: '\u{1F606}',
  blush: '\u{1F60A}',
  heart: '\u2764\uFE0F',
  thumbsup: '\u{1F44D}',
  thumbsdown: '\u{1F44E}',
  fire: '\u{1F525}',
  rocket: '\u{1F680}',
  check: '\u2705',
  white_check_mark: '\u2705',
  x: '\u274C',
  warning: '\u26A0\uFE0F',
  star: '\u2B50',
  bulb: '\u{1F4A1}',
  memo: '\u{1F4DD}',
  link: '\u{1F517}',
  eyes: '\u{1F440}',
  thinking: '\u{1F914}',
  tada: '\u{1F389}',
  bug: '\u{1F41B}',
  construction: '\u{1F6A7}',
  wrench: '\u{1F527}',
};

const EMOJI_PATTERN = /:([a-z0-9_+-]+):/g;

/**
 * Creates an emoji shortcut plugin that replaces `:name:` patterns outside code.
 */
export const emojiPlugin = (options: EmojiPluginOptions = {}): NizelPlugin => {
  const emojiMap = options.emojiMap ? { ...DEFAULT_EMOJI_MAP, ...options.emojiMap } : DEFAULT_EMOJI_MAP;

  return defineNizelPlugin({
    name: 'emoji',
    hooks: {
      beforeParse(markdown) {
        return replaceEmojisOutsideCode(markdown, emojiMap);
      },
    },
  });
};

/**
 * Replaces emoji patterns while preserving fenced and inline code.
 */
export const replaceEmojisOutsideCode = (markdown: string, emojiMap: EmojiMap): string => {
  const segments: string[] = [];
  let remaining = markdown;

  while (remaining.length > 0) {
    const fenceMatch = /^( {0,3})(`{3,}|~{3,})[ \t]*.*$/m.exec(remaining);
    if (!fenceMatch) {
      segments.push(replaceEmojisProtectInlineCode(remaining, emojiMap));
      break;
    }

    const fenceStart = fenceMatch.index;
    const fenceMarker = fenceMatch[2];
    const fenceChar = fenceMarker[0];
    const fenceLength = fenceMarker.length;
    const closePattern = new RegExp(`^ {0,3}\\${fenceChar}{${fenceLength},}\\s*$`, 'm');
    const afterOpen = remaining.slice(fenceStart + fenceMatch[0].length);
    const closeMatch = closePattern.exec(afterOpen);
    const fenceEnd = closeMatch
      ? fenceStart + fenceMatch[0].length + closeMatch.index + closeMatch[0].length
      : remaining.length;

    segments.push(replaceEmojisProtectInlineCode(remaining.slice(0, fenceStart), emojiMap));
    segments.push(remaining.slice(fenceStart, fenceEnd));
    remaining = remaining.slice(fenceEnd);
  }

  return segments.join('');
};

/**
 * Replaces emoji patterns in text while protecting inline code spans.
 */
const replaceEmojisProtectInlineCode = (text: string, emojiMap: EmojiMap): string => {
  const result: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    const codeStart = remaining.indexOf('`');
    if (codeStart === -1) {
      result.push(replaceEmojis(remaining, emojiMap));
      break;
    }

    if (codeStart > 0) result.push(replaceEmojis(remaining.slice(0, codeStart), emojiMap));
    const codeEnd = remaining.indexOf('`', codeStart + 1);
    if (codeEnd === -1) {
      result.push(remaining.slice(codeStart));
      break;
    }

    result.push(remaining.slice(codeStart, codeEnd + 1));
    remaining = remaining.slice(codeEnd + 1);
  }

  return result.join('');
};

/**
 * Replaces known `:name:` emoji shortcuts in a text segment.
 */
const replaceEmojis = (text: string, emojiMap: EmojiMap): string => {
  return text.replace(EMOJI_PATTERN, (match, name: string) => emojiMap[name] ?? match);
};

export default emojiPlugin;
