<template>
  <main :class="[bemm(), 'container', 'container--wide']">
    <aside :class="bemm('sidebar')"><nav :class="bemm('nav')" aria-label="Feature categories"><a v-for="group in groups" :key="group.slug" :class="bemm('nav-link')" :href="`#${group.slug}`"><OpenIcon :name="group.icon" />{{ group.title }}</a></nav></aside>
    <div :class="bemm('content')">
      <header :class="bemm('head')"><p :class="bemm('eyebrow')">Core features</p><h1 :class="bemm('title')">What Nizel provides</h1><p :class="bemm('lede')">The base package handles parsing, structured extraction, rendering, safety, and document transport. Plugins add optional syntax and presentation behavior.</p></header>

      <section v-for="group in groups" :id="group.slug" :key="group.slug" :class="bemm('group')" :aria-labelledby="`${group.slug}-title`">
        <header :class="bemm('group-head')"><span :class="bemm('group-icon')"><OpenIcon :name="group.icon" /></span><div><h2 :id="`${group.slug}-title`">{{ group.title }}</h2><p>{{ group.description }}</p></div></header>
        <div :class="bemm('grid')"><article v-for="feature in group.features" :key="feature.title" :class="bemm('feature')"><h3>{{ feature.title }}</h3><p>{{ feature.description }}</p><ul><li v-for="detail in feature.details" :key="detail">{{ detail }}</li></ul><RouterLink :to="feature.to">Read the guide <OpenIcon name="arrow-right" /></RouterLink></article></div>
      </section>

      <section :class="bemm('example')" aria-labelledby="feature-example-title"><div :class="bemm('example-copy')"><p :class="bemm('eyebrow')">One parse</p><h2 id="feature-example-title">A complete application result</h2><p>Parse Markdown once, then use the representation each part of the application needs.</p></div><pre><code>const result = await nizel(source);

result.html;        // rendered output
result.meta;        // frontmatter
result.toc;         // document navigation
result.links;       // referenced URLs
result.images;      // image metadata
result.text;        // searchable text
result.readingTime; // word and time estimate
result.ast;         // stable document tree</code></pre></section>

      <section :class="bemm('example')" aria-labelledby="reverse-example-title"><div :class="bemm('example-copy')"><p :class="bemm('eyebrow')">Reverse Markdown</p><h2 id="reverse-example-title">Move in both directions</h2><p>Render Markdown for the application, then convert edited semantic HTML back to Markdown when needed.</p></div><pre><code>const html = await markdownToHtml('# Introduction');

const markdown = htmlToMarkdown(
  '&lt;h1&gt;Introduction&lt;/h1&gt;&lt;p&gt;Hello &lt;strong&gt;world&lt;/strong&gt;.&lt;/p&gt;'
);

// # Introduction
//
// Hello **world**.</code></pre></section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { useBemm } from "bemm";
import { RouterLink } from "vue-router";
import OpenIcon from "@/components/OpenIcon";
const bemm = useBemm("features-view", { includeBaseClass: true });
const groups = [
  { title: "Parse and render", slug: "parse-render", icon: "code", description: "CommonMark input becomes safe, application-ready output.", features: [
    { title: "CommonMark parser", description: "A predictable Markdown parser with full CommonMark conformance coverage.", details: ["652 / 652 specification examples", "Block and inline parsing", "Node.js, browsers, and Workers"], to: "/guides/getting-started" },
    { title: "HTML rendering", description: "Render the AST with configurable elements and heading anchors.", details: ["Custom element output", "Generated heading IDs", "AST-first rendering API"], to: "/guides/elements" },
    { title: "Reverse Markdown", description: "Convert semantic HTML back into readable Markdown.", details: ["HTML → Markdown conversion", "Preserve or drop unsupported HTML", "Browser selection and round trips"], to: "/guides/html-to-markdown" },
  ] },
  { title: "Extract structure", slug: "structure", icon: "tree", description: "Build navigation, search, previews, and metadata without parsing twice.", features: [
    { title: "Structured result", description: "Receive HTML and normalized document information from one call.", details: ["Links and images", "Plain text and excerpts", "Reading-time metrics"], to: "/guides/result" },
    { title: "Frontmatter", description: "Parse YAML metadata and make it available to the document pipeline.", details: ["Typed application metadata", "Template access", "Predictable result shape"], to: "/guides/frontmatter" },
    { title: "Table of contents", description: "Collect headings into a navigation-ready hierarchy.", details: ["Heading depth and level", "Stable slugs and IDs", "Nested navigation data"], to: "/guides/toc" },
  ] },
  { title: "Transform and extend", slug: "transform", icon: "edit", description: "Adapt the document without depending on private parser internals.", features: [
    { title: "Stable AST", description: "Visit and change normalized document nodes before rendering.", details: ["Document visitor", "Custom renderers", "Serializable node structure"], to: "/guides/transforms" },
    { title: "Templates and filters", description: "Interpolate runtime data with explicit formatting behavior.", details: ["Runtime variables", "Frontmatter variables", "Formatting and case filters"], to: "/guides/template" },
    { title: "Syntax highlighting", description: "Render fenced code with Shiki while keeping the core parser runtime-neutral.", details: ["Light and dark themes", "Language-aware tokens", "Worker-compatible integration"], to: "/plugins/shiki" },
  ] },
  { title: "Ship safely", slug: "delivery", icon: "shield", description: "Move and render documents across application boundaries.", features: [
    { title: "Safe output", description: "Control raw HTML and sanitize rendered content for its destination.", details: ["Safe mode", "Sanitizer integration", "Escaped text and attributes"], to: "/guides/safety" },
    { title: "Portable documents", description: "Serialize a versioned document and render it in another environment.", details: ["Versioned format", "Storage and transport", "Cross-runtime rendering"], to: "/guides/nizel-format" },
    { title: "Streaming completion", description: "Process incrementally received Markdown and finalize a stable result.", details: ["Chunked input", "Completion boundary", "Application-owned transport"], to: "/guides/pipeline" },
  ] },
];
</script>

<style lang="scss">
@use "@/styles/tone" as tone;
.features-view { display: grid; grid-template-columns: 15rem minmax(0, 1fr); align-items: start; gap: var(--space-xxl); padding-block: clamp(3rem, 7vw, 6rem); &__sidebar { position: sticky; top: 5.5rem; } &__nav { display: flex; flex-direction: column; gap: .25rem; } &__nav-link { display: flex; align-items: center; gap: .5rem; padding-block: .3rem; color: tone.muted(); font-size: .86rem; text-decoration: none; } &__nav-link:hover { color: var(--color-foreground); font-weight: 600; } &__content { min-width: 0; } &__head { max-width: 52rem; } &__eyebrow, &__title, &__lede { margin: 0; } &__eyebrow { color: tone.muted(); font-size: .625rem; font-weight: 600; letter-spacing: .045em; text-transform: uppercase; } &__title { margin-top: .6rem; font-size: clamp(2.5rem, 6vw, 5rem); letter-spacing: -.045em; line-height: 1; } &__lede { max-width: 62ch; margin-top: 1.25rem; color: tone.muted(); font-size: 1.05rem; } &__group { margin-top: clamp(4rem, 8vw, 7rem); scroll-margin-top: 6rem; } &__group-head { display: flex; align-items: flex-start; gap: .85rem; margin-bottom: 1.25rem; } &__group-icon { display: inline-flex; width: 2.25rem; height: 2.25rem; flex: none; align-items: center; justify-content: center; border-radius: .6rem; background: var(--color-primary); color: var(--color-primary-contrast); } &__group-head h2, &__group-head p { margin: 0; } &__group-head h2 { font-size: 1.65rem; } &__group-head p { margin-top: .25rem; color: tone.muted(); font-size: .88rem; } &__grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .75rem; } &__feature { display: flex; min-height: 18rem; flex-direction: column; padding: 1.25rem; border-radius: .9rem; background: tone.surface(); } &__feature h3, &__feature p { margin: 0; } &__feature h3 { font-size: 1rem; } &__feature p { margin-top: .6rem; color: tone.muted(); font-size: .82rem; line-height: 1.5; } &__feature ul { display: grid; gap: .35rem; margin: 1rem 0 0; padding-left: 1.1rem; color: tone.muted(); font-size: .78rem; } &__feature a { display: inline-flex; align-items: center; gap: .35rem; margin-top: auto; padding-top: 1.25rem; color: var(--color-foreground); font-size: .82rem; font-weight: 650; text-decoration: none; } &__feature:hover { background: var(--color-primary); color: var(--color-primary-contrast); } &__feature:hover p, &__feature:hover ul, &__feature:hover a { color: var(--color-primary-contrast); } &__example { display: grid; grid-template-columns: .8fr 1.2fr; gap: 2rem; margin-top: clamp(5rem, 9vw, 8rem); padding: 2rem; border-radius: 1rem; background: tone.surface(); } &__example-copy h2, &__example-copy p { margin: 0; } &__example-copy h2 { margin-top: .5rem; font-size: 1.6rem; } &__example-copy > p:last-child { margin-top: .75rem; color: tone.muted(); } &__example pre { overflow-x: auto; margin: 0; padding: 1.25rem; border-radius: .75rem; background: #0d1117; color: #e6edf3; } &__example code { font-family: var(--font-family-mono); font-size: .78rem; line-height: 1.65; } }
@media (max-width: 60rem) { .features-view { grid-template-columns: 12rem minmax(0, 1fr); &__grid { grid-template-columns: repeat(2, 1fr); } } }
@media (max-width: 44rem) { .features-view { grid-template-columns: 1fr; &__sidebar { position: static; } &__nav { flex-direction: row; overflow-x: auto; } &__nav-link { white-space: nowrap; } &__example { grid-template-columns: 1fr; } } }
@media (max-width: 36rem) { .features-view { &__grid { grid-template-columns: 1fr; } } }
</style>
