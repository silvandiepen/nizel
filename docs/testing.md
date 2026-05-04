# Testing

Nizel's test suite is intended to protect the Markdown behavior documented for the package.

Run all checks:

```bash
npm ci
npm run typecheck
npm run build
npm test
```

Run CommonMark fixture checks:

```bash
npm run test:commonmark:smoke:report
npm run test:commonmark:report
npm run test:commonmark:smoke
npm run test:commonmark
```

`test:commonmark` runs the official CommonMark 0.31.2 examples from the `commonmark-spec` package against Nizel's own parser. It is a strict conformance target and fails when any fixture fails.

The `:report` variants print pass/fail counts and section summaries without failing the process. Use those while closing sections incrementally.

## Test Categories

### Unit Tests

Unit tests cover:

- HTML escaping
- slug generation
- dotted path lookup
- unique slug generation
- default filters
- option resolution
- inline parsing
- Markdown parsing
- HTML rendering
- AST collection
- frontmatter extraction
- template rendering

### Integration Tests

Integration tests cover:

- Markdown to structured result objects
- helper methods
- frontmatter and template interaction
- table of contents
- heading collection
- link and image collection
- autolinks
- code block metadata
- custom blocks
- plugin merge order
- hooks
- transforms
- presets
- safety escaping

### Plugin Tests

Each first-party plugin has its own tests:

- `nizel-plugin-alert`
- `nizel-plugin-autolink`
- `nizel-plugin-code-copy`
- `nizel-plugin-deflist`
- `nizel-plugin-emoji`
- `nizel-plugin-shiki`

`nizel-plugin-shiki` also includes a Worker e2e test. It bundles a Worker module with `esbuild`, runs it in Miniflare/workerd, renders Markdown through `useNizel()`, and asserts that code highlighting uses `nizel-plugin-shiki/javascript` without bundling Shiki's Oniguruma WASM path.

### E2E Consumption Test

The core package includes a package-consumption test that imports `nizel` by package name from the npm workspace and processes Markdown through the public API. Plugin e2e tests import plugin packages the same way so workspace package exports are exercised before publish.

## Documentation Regression

The test suite includes a source documentation test that fails when source function declarations or exported function constants are added without JSDoc.

## Scope

Nizel targets full CommonMark conformance through the official 0.31.2 fixture suite. GFM and plugin-specific behavior is covered by focused unit and integration tests.
