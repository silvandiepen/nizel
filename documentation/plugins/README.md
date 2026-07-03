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

- [Abbreviations](/plugins/abbr/index.html) - Abbreviation definitions.
- [Alerts](/plugins/alert/index.html) - GitHub-style callout blocks.
- [Autolinks](/plugins/autolink/index.html) - Bare URL and email link behavior.
- [Badge](/plugins/badge/index.html) - Inline badges and status labels.
- [Citations](/plugins/citations/index.html) - Simple citation references and bibliography.
- [Code Copy](/plugins/code-copy/index.html) - Copy controls for code blocks.
- [Definition Lists](/plugins/deflist/index.html) - Definition-list Markdown syntax.
- [Details](/plugins/details/index.html) - Disclosure blocks.
- [Diagrams](/plugins/diagrams/index.html) - Mermaid diagram containers.
- [Emoji](/plugins/emoji/index.html) - `:name:` emoji shortcuts outside code.
- [Footnotes](/plugins/footnotes/index.html) - Footnote references and definitions.
- [Frontmatter UI](/plugins/frontmatter-ui/index.html) - Metadata rendering helpers.
- [GFM Preset](/plugins/gfm/index.html) - GFM-oriented companion plugin preset.
- [Heading Anchors](/plugins/heading-anchors/index.html) - Visible heading anchor links.
- [Keyboard Shortcuts](/plugins/kbd/index.html) - Semantic keyboard shortcut markup.
- [Math](/plugins/math/index.html) - Inline and display math wrappers.
- [Media](/plugins/media/index.html) - Figure and image enhancements.
- [Open Icon](/plugins/open-icon/index.html) - Inline SVG icons from the local Open Icon catalog.
- [Print](/plugins/print/index.html) - Print and PDF layout controls.
- [Sanitize](/plugins/sanitize/index.html) - Output sanitizing.
- [Shiki](/plugins/shiki/index.html) - Worker-compatible syntax highlighting integration.
- [Task Lists](/plugins/task-list/index.html) - View-only or editable task-list checkboxes.
- [Table of Contents](/plugins/toc/index.html) - Rendered `[[toc]]`.
- [Typography](/plugins/typography/index.html) - Mark, subscript, and superscript extensions.

For plugin authoring concepts and pipeline hook details, read the [plugin guide](/guides/plugins/index.html).
