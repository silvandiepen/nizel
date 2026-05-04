---
title: Plugins
icon: ui/puzzle
archive: articles
menuChildren: true
order: 2
---

# Plugins

First-party Nizel plugins add focused behavior without changing the core content pipeline.

Install the packages you need, register them in `useNizel({ plugins })`, and keep plugin behavior explicit at the call site.

## Available Plugins

- [Alerts](/plugins/alert/index.html) - GitHub-style callout blocks.
- [Autolinks](/plugins/autolink/index.html) - Bare URL and email link behavior.
- [Code Copy](/plugins/code-copy/index.html) - CSP-friendly copy controls for code blocks.
- [Definition Lists](/plugins/deflist/index.html) - Definition-list Markdown syntax.
- [Emoji](/plugins/emoji/index.html) - `:name:` emoji shortcuts outside code.
- [Shiki](/plugins/shiki/index.html) - Worker-compatible syntax highlighting integration.

For plugin authoring concepts and pipeline hook details, read the [plugin guide](/guides/plugins/index.html).
