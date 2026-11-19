<template>
  <div :class="[bemm(), 'container', 'container--wide']">
    <aside :class="bemm('sidebar')"><nav :class="bemm('nav')" aria-label="Documentation"><section v-for="group in groups" :key="group.label" :class="bemm('group')"><button :class="bemm('group-toggle')" type="button" :aria-expanded="openGroups.has(group.label)" @click="toggleGroup(group.label)"><span>{{ group.label }}</span><OpenIcon name="chevron-down" /></button><div :class="[bemm('group-panel'), openGroups.has(group.label) ? bemm('group-panel', 'open') : '']"><div :class="bemm('group-links')"><RouterLink v-for="item in group.items" :key="item.path" :class="bemm('link')" :to="item.path">{{ item.label }}</RouterLink></div></div></section></nav></aside>
    <main :class="[bemm('content'), isBenchmark ? bemm('content', 'wide') : '']"><BenchmarkSummary v-if="isBenchmark" /><MarkdownContent v-else-if="source" :source="source" /><p v-else :class="bemm('missing')">Documentation page not found.</p></main>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useBemm } from "bemm";
import { RouterLink, useRoute } from "vue-router";
import MarkdownContent from "@/components/MarkdownContent";
import BenchmarkSummary from "@/components/BenchmarkSummary";
import OpenIcon from "@/components/OpenIcon";
const bemm = useBemm("documentation-view", { includeBaseClass: true });
const route = useRoute();
const files = import.meta.glob(["/guides/*.md", "/plugins/*.md"], { eager: true, query: "?raw", import: "default" }) as Record<string, string>;
function items(section: string) { return Object.keys(files).filter((key) => key.includes(`/${section}/`)).map((key) => { const file = key.split("/").pop()?.replace(".md", "") ?? ""; return { label: file === "README" ? section.replace("-", " ") : file.replaceAll("-", " "), path: `/${section}/${file === "README" ? "index" : file}` }; }); }
const guideItems = items("guides");
const pluginItems = items("plugins").filter((item) => !item.path.endsWith("/index"));
const takeFrom = (sourceItems: typeof guideItems, names: string[]) => sourceItems.filter((item) => names.includes(item.path.split("/").pop() ?? ""));
const guideGroups = [
  { label: "Start", items: takeFrom(guideItems, ["index", "getting-started", "api", "result"]) },
  { label: "Process content", items: takeFrom(guideItems, ["pipeline", "elements", "frontmatter", "filters", "template", "toc"]) },
  { label: "Extend", items: takeFrom(guideItems, ["plugins", "presets", "transforms", "styling"]) },
  { label: "Integrate", items: takeFrom(guideItems, ["nizel-format", "nizel-kit", "html-to-markdown", "webassembly"]) },
  { label: "Quality", items: takeFrom(guideItems, ["safety", "testing", "benchmarks"]) },
];
const pluginGroups = [
  { label: "Authoring", items: takeFrom(pluginItems, ["abbr", "alert", "deflist", "details", "footnotes", "kbd", "task-list", "typography"]) },
  { label: "Presentation", items: takeFrom(pluginItems, ["badge", "code-copy", "diagrams", "emoji", "math", "media", "open-icon", "shiki"]) },
  { label: "Navigation and delivery", items: takeFrom(pluginItems, ["autolink", "citations", "frontmatter-ui", "gfm", "heading-anchors", "hidden-comments", "print", "sanitize", "toc"]) },
];
const groups = computed(() => (route.params.section === "plugins" ? pluginGroups : guideGroups).filter((group) => group.items.length));
const groupForRoute = () => groups.value.find((group) => group.items.some((item) => item.path === route.path))?.label ?? groups.value[0]?.label;
const openGroups = ref(new Set<string>(groupForRoute() ? [groupForRoute()!] : []));
function toggleGroup(label: string) { openGroups.value = openGroups.value.has(label) ? new Set() : new Set([label]); }
watch(() => route.path, () => { const label = groupForRoute(); if (label) openGroups.value = new Set([label]); });
const source = computed(() => { const section = String(route.params.section); const slug = String(route.params.slug || "README"); const suffix = `/${section}/${slug === "index" ? "README" : slug}.md`; return Object.entries(files).find(([key]) => key.endsWith(suffix))?.[1] ?? ""; });
const isBenchmark = computed(() => route.params.section === "guides" && route.params.slug === "benchmarks");
</script>
<style lang="scss">
@use "@/styles/tone" as tone;
.documentation-view { display: grid; grid-template-columns: 15rem minmax(0, 1fr); align-items: start; gap: var(--space-xxl); min-height: 100vh; padding-block: var(--space-xl) calc(var(--space-xxl) * 2); &__sidebar { position: sticky; top: 5.5rem; align-self: start; max-height: calc(100vh - 7rem); overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; } &__nav, &__group, &__group-links { display: flex; flex-direction: column; } &__nav { gap: .35rem; padding-bottom: var(--space-l); } &__group { gap: .15rem; } &__group-toggle { display: flex; width: 100%; align-items: center; justify-content: space-between; gap: 1rem; padding: .45rem 0; border: 0; background: transparent; color: tone.muted(); font: inherit; font-size: .7rem; font-weight: 650; letter-spacing: .04em; text-align: left; text-transform: uppercase; cursor: pointer; } &__group-toggle .open-icon { transition: transform 180ms ease; } &__group-toggle[aria-expanded="true"] { color: var(--color-foreground); } &__group-toggle[aria-expanded="true"] .open-icon { transform: rotate(180deg); } &__group-panel { display: grid; grid-template-rows: 0fr; opacity: 0; transition: grid-template-rows 220ms ease, opacity 160ms ease; } &__group-panel--open { grid-template-rows: 1fr; opacity: 1; } &__group-links { min-height: 0; gap: .1rem; overflow: hidden; padding: 0; } &__group-panel--open &__group-links { padding: .1rem 0 .5rem; } &__link { padding: .2rem 0; color: tone.muted(); font-size: .86rem; text-decoration: none; text-transform: capitalize; &:hover { color: var(--color-foreground); } &.router-link-active { color: var(--color-foreground); font-weight: 700; } } &__content { min-width: 0; max-width: 50rem; } &__content--wide { max-width: 68rem; } }
@media (max-width: 48rem) { .documentation-view { grid-template-columns: 1fr; &__sidebar { position: static; max-height: none; } &__nav { flex-direction: row; overflow-x: auto; } &__group { min-width: 12rem; } } }
</style>
