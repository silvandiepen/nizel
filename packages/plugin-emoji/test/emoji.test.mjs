import assert from 'node:assert/strict';
import { test } from 'vitest';
import { useNizel } from 'nizel';
import { DEFAULT_EMOJI_MAP, emojiPlugin, replaceEmojisOutsideCode } from '../dist/index.js';

test('unit: replaces known emoji shortcuts outside code spans and fenced code', () => {
  const markdown = 'Ship :rocket: `:rocket:`\n\n```txt\n:rocket:\n```';

  assert.equal(
    replaceEmojisOutsideCode(markdown, DEFAULT_EMOJI_MAP),
    'Ship 🚀 `:rocket:`\n\n```txt\n:rocket:\n```',
  );
});

test('integration: supports custom emoji maps', async () => {
  const nizel = useNizel({ plugins: [emojiPlugin({ emojiMap: { nizel: 'N' } })] });

  assert.equal(await nizel.text('Hello :nizel: :missing:'), 'Hello N :missing:');
});
