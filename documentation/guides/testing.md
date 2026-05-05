---
title: Testing
icon: ui/check
order: 13
---

# Testing

Nizel's test suite protects the Markdown behavior documented for the package.

## CommonMark Conformance

Nizel runs the full CommonMark 0.31 spec test suite:

```bash
npm run test:commonmark
```

This runs all 652 spec tests against the Nizel parser and reports pass/fail for each.

The browser bundle runs the same suite:

```bash
npm run test:commonmark:browser
```

This targets `packages/nizel/dist/browser/nizel.js`, the bundled ESM artifact intended for browser and `WKWebView` use.

## Detailed Report

For a section-by-section breakdown:

```bash
npm run test:commonmark:report
```

## Unit Tests

Unit tests cover Nizel-specific features beyond the spec:

- frontmatter extraction
- template variable resolution
- filter application
- element customization
- HTML to Markdown conversion
- plugin hooks
- preset behavior
- metadata collection

```bash
npm run test
```

## Worker E2E

`nizel-plugin-shiki` includes a Worker e2e test for code highlighting. The test bundles a Worker module with `esbuild`, runs it in Miniflare/workerd, renders Markdown with `useNizel()`, and verifies that highlighted code is produced without bundling Shiki's Oniguruma WASM path.

## Writing Tests

Tests use Vitest. Example:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { useNizel } from 'nizel';

describe('frontmatter', () => {
  it('extracts YAML frontmatter', async () => {
    const nizel = useNizel();
    const { meta } = await nizel(`
---
title: Test
---
Content.
`);
    assert.equal(meta.title, 'Test');
  });
});
```

## Conformance Runner

The CommonMark conformance runner lives at:

```txt
packages/nizel/conformance/commonmark-spec-runner.mjs
```

It loads tests from `commonmark-spec`, runs them through `useNizel().parse()` and `render()`, and compares the HTML output.
