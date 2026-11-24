---
title: WebAssembly
icon: ui/lightning
order: 12
---

# WebAssembly

Nizel has an optional first-party WebAssembly backend for Markdown to HTML and HTML to Markdown. The Wasm entry points share Nizel’s JavaScript API and fall back to the JavaScript renderer when the options need it.

## Use the optional build

The Wasm engine ships in the `nizel` package:

~~~sh
npm install nizel
~~~

For Node.js, import from the Wasm entry point:

~~~js
import { useNizel, htmlToMarkdown } from 'nizel/wasm';

const nizel = useNizel();
const html = await nizel.html('A **bold** word.');
const markdown = htmlToMarkdown(html);
~~~

In a browser bundle, use the equivalent helpers from `nizel/browser/wasm`. This entry supports HTML strings, DOM nodes, ranges, and selections. For an offline WebView with official plugins, use `nizel-kit/wasm` or the package’s `dist/nizel-kit.wasm.iife.js` file. The IIFE exposes the same `NizelKit` global as the standard bundle.

The Wasm bytes travel with the optional build. The first eligible call initializes the module locally. Browsers that block compilation, including under a restrictive Content Security Policy, use the JavaScript fallback. Standard imports continue to use JavaScript.

## Speed

With default options, the Wasm engine renders real documents about 10× faster than markdown-it, 8× faster than marked and 200× faster than remark. See [Benchmarks](/guides/benchmarks) for the documents, the method and the command that reproduces it.

## What it covers

The engine renders the same Markdown as the JavaScript engine, with identical output: it passes the CommonMark and GFM spec suites and Nizel's own test suite through the Wasm entry points. Plugins that can change the output, transforms, custom element rules and block renderers parse with the engine and render through the JavaScript renderer. Inputs over 1,048,576 UTF-16 code units use JavaScript. Before-parse and after-render hooks run on either path.

Benchmark on representative inputs and check the fallback path before enabling it in an application.
