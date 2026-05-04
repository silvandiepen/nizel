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

- `nizel-plugin-autolink`
- `nizel-plugin-code-copy`
- `nizel-plugin-shiki`

### E2E Consumption Test

The core package includes a package-consumption test that imports `nizel` by package name from the npm workspace and processes Markdown through the public API.

## Documentation Regression

The test suite includes a source documentation test that fails when source function declarations or exported function constants are added without JSDoc.

## Scope

Nizel tests the Markdown subset it documents and supports. The package does not currently claim full CommonMark compliance.

If Nizel expands to full CommonMark or GitHub Flavored Markdown compatibility, the test suite should add official spec fixtures and compatibility snapshots before the claim is made.

The CommonMark fixture runner has been added. Full conformance is achieved only when `npm run test:commonmark` passes.
