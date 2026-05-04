import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  getAutolinkOptions,
  isExternalHref,
  trimTrailingPunctuation,
} from '../dist/parse/autolink.js';

test('trimTrailingPunctuation removes punctuation excluded from bare autolinks', () => {
  assert.equal(trimTrailingPunctuation('https://example.com/test).'), 'https://example.com/test');
  assert.equal(trimTrailingPunctuation('https://example.com/a-b'), 'https://example.com/a-b');
});

test('getAutolinkOptions normalizes boolean and object config', () => {
  assert.deepEqual(getAutolinkOptions(undefined), { enabled: true });
  assert.deepEqual(getAutolinkOptions(false), { enabled: false });
  assert.deepEqual(getAutolinkOptions({ enabled: true, class: 'link' }), {
    enabled: true,
    class: 'link',
  });
});

test('isExternalHref recognizes absolute and protocol-relative links', () => {
  assert.equal(isExternalHref('https://example.com'), true);
  assert.equal(isExternalHref('http://example.com'), true);
  assert.equal(isExternalHref('//example.com'), true);
  assert.equal(isExternalHref('/docs'), false);
  assert.equal(isExternalHref('mailto:test@example.com'), false);
});
