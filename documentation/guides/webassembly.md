---
title: WebAssembly
icon: ui/lightning
order: 12
---

# WebAssembly

Nizel has an optional first-party WebAssembly backend for Markdown to HTML and HTML to Markdown. The Wasm entry points share Nizel’s JavaScript API and use its existing renderer whenever a document needs features outside the accelerated subset.

## Use the optional build

For Node.js, import from the Wasm entry point:

~~~js
import { useNizel, htmlToMarkdown } from 'nizel/wasm';

const nizel = useNizel();
const html = await nizel.html('A **bold** word.');
const markdown = htmlToMarkdown(html);
~~~

In a browser bundle, use the equivalent helpers from `nizel/browser/wasm`. This entry supports HTML strings, DOM nodes, ranges, and selections. For an offline WebView with official plugins, use `nizel-kit/wasm` or the package’s `dist/nizel-kit.wasm.iife.js` file. The IIFE exposes the same `NizelKit` global as the standard bundle.

The Wasm bytes travel with the optional build. The first eligible call initializes the module locally. Browsers that block compilation, including under a restrictive Content Security Policy, use the JavaScript fallback. Standard imports continue to use JavaScript.

## What it accelerates

The forward path covers ASCII paragraphs, soft and hard line breaks, simple ATX headings and heading IDs, inline code, and simple emphasis. The reverse path covers corresponding semantic HTML and common named entities. Complex syntax, custom rendering rules, AST-dependent plugins, reverse plugin handlers, and inputs over 1,048,576 UTF-16 code units use JavaScript. Before-parse and after-render hooks run on either path. APIs that return ASTs, document objects, metadata, or collected text continue through the existing pipeline.

Coverage depends on the document and plugin settings. Benchmark both conversions on representative inputs and check the fallback path before enabling it in an application.
