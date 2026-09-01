<template>
  <main :class="[bemm(), 'container', 'container--wide']">
    <aside :class="bemm('sidebar')"><nav :class="bemm('sidebar-nav')" aria-label="Plugin categories"><section v-for="group in groups" :key="group.slug" :class="bemm('sidebar-group')"><a :class="bemm('sidebar-title')" :href="`#plugins-${group.slug}`">{{ group.title }}</a><RouterLink v-for="plugin in group.plugins" :key="plugin.slug" :class="bemm('sidebar-link')" :to="`/plugins/${plugin.slug}`">{{ plugin.name }}</RouterLink></section></nav></aside>
    <div :class="bemm('content')">
    <header :class="bemm('head')">
      <p :class="bemm('eyebrow')">Plugin directory</p>
      <h1 :class="bemm('title')">Extend the content pipeline</h1>
      <p :class="bemm('lede')">First-party plugins add one focused capability at a time. Install only what the application needs and register it explicitly in the parser configuration.</p>
      <div :class="bemm('install')"><OpenIcon name="terminal" /><code>npm install nizel-plugin-shiki</code></div>
    </header>

    <section v-for="group in groups" :key="group.title" :class="bemm('group')" :aria-labelledby="`plugins-${group.slug}`">
      <header :class="bemm('group-head')"><div><h2 :id="`plugins-${group.slug}`">{{ group.title }}</h2><p>{{ group.description }}</p></div><span>{{ group.plugins.length }} plugins</span></header>
      <div :class="bemm('grid')">
        <RouterLink v-for="plugin in group.plugins" :key="plugin.slug" :class="bemm('tile')" :to="`/plugins/${plugin.slug}`">
          <span :class="bemm('tile-icon')"><OpenIcon :name="plugin.icon" /></span>
          <div :class="bemm('tile-copy')"><h3>{{ plugin.name }}</h3><p>{{ plugin.description }}</p></div>
          <OpenIcon name="arrow-right" />
        </RouterLink>
      </div>
    </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { useBemm } from "bemm";
import { RouterLink } from "vue-router";
import OpenIcon from "@/components/OpenIcon";

const bemm = useBemm("plugins-view", { includeBaseClass: true });
const groups = [
  { title: "Authoring", slug: "authoring", description: "Additional Markdown syntax and document structures.", plugins: [
    { name: "Abbreviations", slug: "abbr", icon: "book", description: "Define and render abbreviations." }, { name: "Alerts", slug: "alert", icon: "mail", description: "GitHub-style callout blocks." }, { name: "Definition lists", slug: "deflist", icon: "book", description: "Definition-list Markdown syntax." }, { name: "Details", slug: "details", icon: "chevron-down", description: "Collapsible disclosure blocks." }, { name: "Footnotes", slug: "footnotes", icon: "link", description: "References and footnote definitions." }, { name: "Keyboard shortcuts", slug: "kbd", icon: "code", description: "Semantic keyboard markup." }, { name: "Task lists", slug: "task-list", icon: "clipboard", description: "Static or editable checkboxes." }, { name: "Typography", slug: "typography", icon: "edit", description: "Marks, subscripts, and superscripts." },
  ] },
  { title: "Presentation", slug: "presentation", description: "Turn structured content into richer application output.", plugins: [
    { name: "Badge", slug: "badge", icon: "code", description: "Inline status labels." }, { name: "Code copy", slug: "code-copy", icon: "clipboard", description: "Copy controls for code blocks." }, { name: "Diagrams", slug: "diagrams", icon: "tree", description: "Mermaid-ready diagram containers." }, { name: "Emoji", slug: "emoji", icon: "edit", description: "Emoji shortcut replacement." }, { name: "Math", slug: "math", icon: "code", description: "Inline and display math wrappers." }, { name: "Media", slug: "media", icon: "book", description: "Figures and image attributes." }, { name: "Open Icon", slug: "open-icon", icon: "edit", description: "Local inline SVG icons." }, { name: "Shiki", slug: "shiki", icon: "code", description: "Worker-compatible syntax highlighting." },
  ] },
  { title: "Navigation and delivery", slug: "delivery", description: "Links, navigation, metadata, safety, and output workflows.", plugins: [
    { name: "Autolinks", slug: "autolink", icon: "link", description: "Bare URL and email links." }, { name: "Citations", slug: "citations", icon: "book", description: "References and bibliography output." }, { name: "Frontmatter UI", slug: "frontmatter-ui", icon: "code", description: "Render metadata as interface elements." }, { name: "GFM preset", slug: "gfm", icon: "code", description: "A GFM-oriented plugin bundle." }, { name: "Heading anchors", slug: "heading-anchors", icon: "link", description: "Visible links for headings." }, { name: "Hidden comments", slug: "hidden-comments", icon: "mail", description: "Controlled reviewer comments." }, { name: "Print", slug: "print", icon: "book", description: "Print and PDF layout controls." }, { name: "Sanitize", slug: "sanitize", icon: "shield", description: "Remove risky rendered HTML." }, { name: "Table of contents", slug: "toc", icon: "tree", description: "Render document navigation." },
  ] },
];
</script>

<style lang="scss">
@use "@/styles/tone" as tone;
.plugins-view { display: grid; grid-template-columns: 15rem minmax(0, 1fr); align-items: start; gap: var(--space-xxl); padding-block: clamp(3rem, 7vw, 6rem); &__sidebar { position: sticky; top: 5.5rem; max-height: calc(100vh - 7rem); overflow-y: auto; scrollbar-width: thin; } &__sidebar-nav, &__sidebar-group { display: flex; flex-direction: column; } &__sidebar-nav { gap: 1.25rem; } &__sidebar-group { gap: .18rem; } &__sidebar-title { margin-bottom: .25rem; color: var(--color-foreground); font-size: .7rem; font-weight: 700; letter-spacing: .04em; text-decoration: none; text-transform: uppercase; } &__sidebar-link { padding-block: .16rem; color: tone.muted(); font-size: .84rem; text-decoration: none; } &__sidebar-link:hover { color: var(--color-foreground); } &__content { min-width: 0; } &__head { max-width: 52rem; } &__eyebrow, &__title, &__lede { margin: 0; } &__eyebrow { color: tone.muted(); font-size: .625rem; font-weight: 600; letter-spacing: .045em; text-transform: uppercase; } &__title { max-width: 15ch; margin-top: .6rem; font-size: clamp(2.5rem, 6vw, 5rem); letter-spacing: -.045em; line-height: 1; } &__lede { max-width: 64ch; margin-top: 1.25rem; color: tone.muted(); font-size: 1.05rem; } &__install { display: inline-flex; align-items: center; gap: .6rem; margin-top: 1.5rem; padding: .65rem .85rem; border-radius: .65rem; background: tone.surface(); } &__install code { font-family: var(--font-family-mono); font-size: .82rem; } &__group { margin-top: clamp(4rem, 8vw, 7rem); scroll-margin-top: 6rem; } &__group-head { display: flex; align-items: end; justify-content: space-between; gap: 2rem; margin-bottom: 1.25rem; } &__group-head h2, &__group-head p { margin: 0; } &__group-head h2 { font-size: 1.75rem; } &__group-head p, &__group-head > span { color: tone.muted(); font-size: .85rem; } &__group-head p { margin-top: .35rem; } &__grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .75rem; } &__tile { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: start; gap: .85rem; min-height: 8.5rem; padding: 1.15rem; border-radius: .85rem; background: tone.surface(); color: var(--color-foreground); text-decoration: none; } &__tile:hover { background: var(--color-primary); color: var(--color-primary-contrast); } &__tile-icon { display: inline-flex; width: 2rem; height: 2rem; align-items: center; justify-content: center; border-radius: .5rem; background: var(--color-background); color: var(--color-foreground); } &__tile-copy h3, &__tile-copy p { margin: 0; } &__tile-copy h3 { font-size: .95rem; } &__tile-copy p { margin-top: .35rem; color: tone.muted(); font-size: .78rem; line-height: 1.45; } &__tile:hover &__tile-copy p { color: var(--color-primary-contrast); } }
@media (max-width: 60rem) { .plugins-view { grid-template-columns: 12rem minmax(0, 1fr); &__grid { grid-template-columns: repeat(2, 1fr); } } }
@media (max-width: 44rem) { .plugins-view { grid-template-columns: 1fr; &__sidebar { position: static; max-height: none; } &__sidebar-nav { flex-direction: row; overflow-x: auto; } &__sidebar-group { min-width: 11rem; } } }
@media (max-width: 36rem) { .plugins-view { &__grid { grid-template-columns: 1fr; } &__group-head { align-items: flex-start; flex-direction: column; gap: .5rem; } } }
</style>
