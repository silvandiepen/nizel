---
projectTitle: Nizel
projectDescription: A Markdown content processor for modern applications.
projectSearch: true
hide: true
---

# Nizel

A Markdown content processor for modern applications.

Turn Markdown into structured content your app can use — HTML, frontmatter, TOC, headings, links, images, plain text, excerpts, reading time, and a full AST.

One call. One result object. Everything you need.

## Install

```bash
npm install nizel
```

## Quick Start

```ts
import { useNizel } from 'nizel';

const nizel = useNizel();

const { html, meta, toc, title, readingTime } = await nizel(`
---
title: Hello World
description: My first Nizel page
---

# {{ meta.title }}

Welcome to **Nizel**.
`);
```

## Why Nizel

Most Markdown parsers answer one question: how do I turn Markdown into HTML?

Nizel answers a more useful question: how do I turn Markdown into structured content my app can use?

In real products, Markdown usually needs more than rendered HTML. It needs metadata, frontmatter, slugs, anchors, TOC generation, custom blocks, design-system classes, safe links, variables, filters, and plugin-based extension points.

Nizel is not a parser with a nicer name. It is a content engine with Markdown as its input format. The parser is an implementation detail. The public value is the stable content model and the simple API.

## CommonMark Compliant

Nizel passes the full CommonMark 0.31 specification test suite — all 652 tests.

CommonMark is the only standardized, cross-implementation Markdown specification. It defines exactly how Markdown should parse and render, removing the ambiguity that plagues most parsers.

Compliance means your content renders consistently. No surprises. No edge cases. What you write is what you get.

## What You Get

- Markdown to HTML
- Frontmatter extraction with typed metadata
- Template variables with built-in filters from `@sil/format` and `@sil/case`
- Table of contents generation
- Heading anchors and slugs
- Plain-text extraction and excerpts
- Reading-time calculation
- Link and image extraction
- Element customization
- AST transforms
- Plugin system with beforeParse, transform, and afterRender hooks
- Safe output defaults
- Presets for blog, docs, email, and minimal usage

## Explore the Docs

- [Getting Started](/guides/getting-started/index.html) — install, configure, and run your first parse
- [API Reference](/guides/api/index.html) — every option and return value
- [Pipeline](/guides/pipeline/index.html) — the processing order from input to result
- [Result Object](/guides/result/index.html) — what you get back from a parse call
- [Template Variables](/guides/template/index.html) — inject data into your Markdown
- [Filters](/guides/filters/index.html) — built-in formatting and case transforms
- [Frontmatter](/guides/frontmatter/index.html) — extract and use metadata
- [Table of Contents](/guides/toc/index.html) — automatic heading collection
- [Elements](/guides/elements/index.html) — customize HTML output
- [Plugins](/guides/plugins/index.html) — extend Nizel with your own logic
- [Presets](/guides/presets/index.html) — blog, docs, email, and minimal bundles
- [Safety](/guides/safety/index.html) — safe output defaults
- [Testing](/guides/testing/index.html) — test suite and conformance
- [Release Notes](/release-notes/index.html) — version history
