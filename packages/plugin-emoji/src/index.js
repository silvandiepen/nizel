import { defineNizelPlugin } from 'nizel';

/**
 * Built-in emoji map with common emoji shortcuts.
 */
const EMOJI_MAP = {
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

/**
 * Pattern matching :emoji_name: shortcuts.
 * Matches :word: where word contains lowercase letters, digits, underscores, plus, or hyphens.
 */
const EMOJI_PATTERN = /:([a-z0-9_+-]+):/g;

/**
 * Creates an emoji shortcut plugin that replaces `:emoji_name:` patterns
 * with actual unicode emoji characters, skipping code blocks.
 *
 * Supported syntax: `:smile:` → 😄
 *
 * Does NOT match inside fenced code blocks (```) or inline code (`).
 */
export function emojiPlugin(options = {}) {
  const emojiMap = options.emojiMap
    ? { ...EMOJI_MAP, ...options.emojiMap }
    : EMOJI_MAP;

  return defineNizelPlugin({
    name: 'emoji',
    hooks: {
      beforeParse(markdown) {
        // Split markdown into segments, protecting fenced code blocks and inline code
        const segments = [];
        let remaining = markdown;

        // Process by splitting on fenced code blocks first
        while (remaining.length > 0) {
          // Find the next fenced code block
          const fenceMatch = /^( {0,3})(`{3,}|~{3,})[ \t]*.*$/m.exec(remaining);

          if (fenceMatch) {
            const fenceStart = fenceMatch.index;
            const fenceMarker = fenceMatch[2];
            const fenceChar = fenceMarker[0];
            const fenceLen = fenceMarker.length;
            const closePattern = new RegExp(`^ {0,3}\\${fenceChar}{${fenceLen},}\\s*$`, 'm');

            // Find the closing fence
            const afterOpen = remaining.slice(fenceStart + fenceMatch[0].length);
            const closeMatch = closePattern.exec(afterOpen);
            const fenceEnd = closeMatch
              ? fenceStart + fenceMatch[0].length + closeMatch.index + closeMatch[0].length
              : remaining.length;

            // Process text before the fence for emojis
            const before = remaining.slice(0, fenceStart);
            segments.push(replaceEmojisProtectInlineCode(before, emojiMap));

            // Keep the fence block as-is
            segments.push(remaining.slice(fenceStart, fenceEnd));

            remaining = remaining.slice(fenceEnd);
          } else {
            // No more fences, process remaining text
            segments.push(replaceEmojisProtectInlineCode(remaining, emojiMap));
            break;
          }
        }

        return segments.join('');
      },
    },
  });
}

/**
 * Replaces emoji patterns in text while protecting inline code spans.
 */
function replaceEmojisProtectInlineCode(text, emojiMap) {
  const result = [];
  let remaining = text;

  while (remaining.length > 0) {
    // Find the next inline code span
    const codeStart = remaining.indexOf('`');

    if (codeStart === -1) {
      // No more inline code, process the rest
      result.push(replaceEmojis(remaining, emojiMap));
      break;
    }

    // Process text before the inline code
    if (codeStart > 0) {
      result.push(replaceEmojis(remaining.slice(0, codeStart), emojiMap));
    }

    // Find the closing backtick
    const codeEnd = remaining.indexOf('`', codeStart + 1);

    if (codeEnd === -1) {
      // No closing backtick, treat the rest as-is
      result.push(remaining.slice(codeStart));
      break;
    }

    // Include the content with backticks as-is
    result.push(remaining.slice(codeStart, codeEnd + 1));
    remaining = remaining.slice(codeEnd + 1);
  }

  return result.join('');
}

/**
 * Replaces :emoji_name: patterns with unicode emoji characters.
 */
function replaceEmojis(text, emojiMap) {
  return text.replace(EMOJI_PATTERN, (match, name) => {
    return emojiMap[name] ?? match;
  });
}

export default emojiPlugin;
