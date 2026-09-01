<template>
  <main :class="[bemm(), 'container', 'container--wide']">
    <header :class="bemm('head')">
      <div>
        <p :class="bemm('eyebrow')">Playground</p>
        <h1 :class="bemm('title')">Parse and inspect Markdown</h1>
        <p :class="bemm('lede')">Runs locally in your browser. Edit the source and inspect each part of the Nizel result.</p>
      </div>
      <div :class="bemm('head-actions')">
        <label :class="bemm('example-label')" for="playground-example">Example</label>
        <select id="playground-example" v-model="selectedExample" :class="bemm('select')" @change="loadExample"><option v-for="example in examples" :key="example.name" :value="example.name">{{ example.name }}</option></select>
        <button :class="bemm('button')" type="button" @click="reset"><OpenIcon name="arrow-reload-left-right" />Reset</button>
      </div>
    </header>

    <div :class="bemm('summary')" aria-live="polite">
      <span :class="bemm('status', ['', error ? 'error' : status === 'Parsing' ? 'working' : 'ready'])"><i :class="bemm('status-dot')" aria-hidden="true" />{{ error ? "Parse failed" : status }}</span>
      <span>{{ sourceLines }} lines</span>
      <span>{{ result?.readingTime.words ?? 0 }} words</span>
      <span>{{ result?.toc.length ?? 0 }} headings</span>
      <span>{{ elapsed }} ms</span>
    </div>

    <section :class="bemm('workspace')" aria-label="Markdown playground">
      <section :class="bemm('pane')" aria-labelledby="source-title">
        <div :class="bemm('pane-head')"><h2 id="source-title" :class="bemm('pane-title')">Markdown</h2><button :class="bemm('utility')" type="button" @click="copySource"><OpenIcon name="clipboard" />{{ sourceCopied ? "Copied" : "Copy source" }}</button></div>
        <textarea v-model="source" :class="bemm('textarea')" spellcheck="false" aria-label="Markdown source" />
      </section>

      <section :class="bemm('pane')" aria-labelledby="output-title">
        <div :class="bemm('output-head')">
          <h2 id="output-title" :class="bemm('visually-hidden')">Parsed output</h2>
          <div :class="bemm('tabs')" role="tablist" aria-label="Parsed output">
            <button v-for="tab in tabs" :id="`tab-${tab.toLowerCase()}`" :key="tab" :class="bemm('tab', ['', active === tab ? 'active' : ''])" type="button" role="tab" :aria-selected="active === tab" :aria-controls="`panel-${tab.toLowerCase()}`" @click="active = tab">{{ tab }}</button>
          </div>
          <button v-if="active !== 'Preview'" :class="bemm('utility')" type="button" @click="copyOutput"><OpenIcon name="clipboard" />{{ outputCopied ? "Copied" : "Copy output" }}</button>
        </div>
        <div v-if="error" :class="bemm('error')" role="alert"><strong>Unable to parse this document.</strong><span>{{ error }}</span></div>
        <div v-else-if="active === 'Preview'" id="panel-preview" :class="[bemm('preview'), 'prose']" role="tabpanel" aria-labelledby="tab-preview" v-html="previewHtml" />
        <pre v-else :id="`panel-${active.toLowerCase()}`" :class="bemm('data')" role="tabpanel" :aria-labelledby="`tab-${active.toLowerCase()}`"><code>{{ output }}</code></pre>
      </section>
    </section>

    <p :class="bemm('note')">The playground uses the browser build with default settings. For configuration options, see the <RouterLink :class="bemm('note-link')" to="/guides/api">API reference</RouterLink>.</p>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useBemm } from "bemm";
import { RouterLink } from "vue-router";
import { useNizel } from "nizel";
import { createHighlightedProcessor } from "@/lib/highlighting";
import OpenIcon from "@/components/OpenIcon";

const bemm = useBemm("playground-view", { includeBaseClass: true });
const elements = { h1: { class: "prose__heading" }, h2: { class: "prose__heading" }, h3: { class: "prose__subheading" }, p: { class: "prose__paragraph" }, ul: { class: "prose__list" }, ol: { class: "prose__list" }, li: { class: "prose__item" }, a: { class: "prose__link" }, code: { class: "prose__code" }, pre: { class: "prose__pre" }, blockquote: { class: "prose__quote" } } as const;
const examples = [
  { name: "Basic document", source: "---\ntitle: Example document\ndescription: Metadata and structured content\n---\n\n# {{ meta.title }}\n\nNizel parses **Markdown** into content your app can use.\n\n## Included result\n\n- Safe HTML\n- Metadata and navigation\n- Links, images, and text\n- A portable AST\n\n[Read the documentation](/guides/getting-started)" },
  { name: "CommonMark", source: "# CommonMark example\n\n> Block quotes, lists, and code are part of the core parser.\n\n1. Ordered item\n2. Another item\n\n```ts\nconst result = await nizel.parse(source);\nconsole.log(result.toc);\n```\n\n---\n\nEscaped characters: \\*literal asterisks\\*." },
  { name: "Content metadata", source: "---\ntitle: Release notes\nauthor: Nizel\ntags:\n  - markdown\n  - typescript\n---\n\n# {{ meta.title }}\n\nPublished by **{{ meta.author }}**.\n\n## Changes\n\nSee the [API reference](/guides/api) and ![Nizel logo](/logo.svg)." },
];
const defaultSource = examples[0].source;
const source = ref(defaultSource);
const selectedExample = ref(examples[0].name);
const processor = useNizel();
const previewProcessorPromise = createHighlightedProcessor({ elements });
const result = ref<Awaited<ReturnType<typeof processor>> | null>(null);
const previewHtml = ref("");
const status = ref("Ready");
const error = ref("");
const elapsed = ref(0);
const sourceCopied = ref(false);
const outputCopied = ref(false);
const tabs = ["Preview", "Result", "HTML", "AST"] as const;
const active = ref<(typeof tabs)[number]>("Preview");
let timer: number | undefined;
let parseSequence = 0;

const sourceLines = computed(() => source.value.split("\n").length);
const output = computed(() => {
  if (!result.value) return "";
  if (active.value === "AST") return JSON.stringify(result.value.ast, null, 2);
  if (active.value === "HTML") return result.value.html;
  const value = result.value;
  return JSON.stringify({ meta: value.meta, toc: value.toc, links: value.links, images: value.images, readingTime: value.readingTime, text: value.text }, null, 2);
});

async function parse() {
  const sequence = ++parseSequence;
  const started = performance.now();
  try {
    const previewProcessor = await previewProcessorPromise;
    const [nextResult, preview] = await Promise.all([processor(source.value), previewProcessor(source.value)]);
    if (sequence !== parseSequence) return;
    result.value = nextResult;
    previewHtml.value = preview.html;
    error.value = "";
    elapsed.value = Math.max(1, Math.round(performance.now() - started));
    status.value = "Ready";
  } catch (caught) {
    if (sequence !== parseSequence) return;
    error.value = caught instanceof Error ? caught.message : String(caught);
    status.value = "Error";
  }
}

function scheduleParse() { status.value = "Parsing"; window.clearTimeout(timer); timer = window.setTimeout(parse, 180); }
function loadExample() { source.value = examples.find((item) => item.name === selectedExample.value)?.source ?? defaultSource; }
function reset() { selectedExample.value = examples[0].name; source.value = defaultSource; active.value = "Preview"; }
async function copy(text: string, state: typeof sourceCopied) { await navigator.clipboard.writeText(text); state.value = true; window.setTimeout(() => { state.value = false; }, 1500); }
function copySource() { return copy(source.value, sourceCopied); }
function copyOutput() { return copy(output.value, outputCopied); }

onMounted(parse);
watch(source, scheduleParse);
</script>

<style lang="scss">
@use "@/styles/tone" as tone;

.playground-view {
  padding-block: clamp(2.5rem, 6vw, 5rem);
  &__head { display: flex; align-items: end; justify-content: space-between; gap: 2rem; }
  &__eyebrow, &__title, &__lede { margin: 0; }
  &__eyebrow { color: tone.muted(); font-size: .625rem; font-weight: 600; letter-spacing: .045em; text-transform: uppercase; }
  &__title { margin-top: .5rem; font-size: clamp(2.25rem, 5vw, 4rem); font-weight: 600; letter-spacing: -.04em; line-height: 1; }
  &__lede { max-width: 58ch; margin-top: 1rem; color: tone.muted(); font-size: 1.05rem; }
  &__head-actions { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; }
  &__example-label { color: tone.muted(); font-size: .8rem; }
  &__select, &__button, &__utility { min-height: 2.5rem; border: 0; border-radius: .6rem; font: inherit; font-size: .82rem; cursor: pointer; }
  &__button, &__utility { display: inline-flex; align-items: center; justify-content: center; gap: .4rem; }
  &__select, &__button { padding-inline: .8rem; background: tone.surface(); color: var(--color-foreground); }
  &__summary { display: flex; flex-wrap: wrap; align-items: center; gap: .75rem 1.5rem; margin-top: 2rem; padding: .75rem 1rem; border-radius: .75rem; background: tone.surface(); color: tone.muted(); font-size: .78rem; }
  &__status { display: inline-flex; align-items: center; gap: .45rem; color: var(--color-foreground); font-weight: 600; }
  &__status-dot { width: .5rem; height: .5rem; border-radius: 50%; background: #3f9b62; }
  &__status--working &__status-dot { background: #d19328; }
  &__status--error &__status-dot { background: var(--color-error); }
  &__workspace { display: grid; grid-template-columns: 1fr 1fr; height: min(70vh, 48rem); min-height: 34rem; margin-top: 1rem; overflow: hidden; border: 1px solid color-mix(in srgb, var(--color-foreground), transparent 88%); border-radius: 1rem; background: tone.surface(); }
  &__pane { display: flex; min-width: 0; min-height: 0; flex-direction: column; }
  &__pane + &__pane { border-left: 1px solid color-mix(in srgb, var(--color-foreground), transparent 88%); background: var(--color-background); }
  &__pane-head, &__output-head { display: flex; min-height: 3.25rem; align-items: center; justify-content: space-between; gap: 1rem; padding-inline: 1rem; border-bottom: 1px solid color-mix(in srgb, var(--color-foreground), transparent 88%); }
  &__pane-title { margin: 0; font-size: .82rem; font-weight: 700; }
  &__utility { flex: none; min-height: 2rem; padding-inline: .65rem; background: transparent; color: tone.muted(); }
  &__utility:hover { background: var(--color-primary); color: var(--color-primary-contrast); }
  &__textarea { width: 100%; min-height: 0; flex: 1; resize: none; padding: 1.25rem; border: 0; background: transparent; color: var(--color-foreground); font-family: var(--font-family-mono); font-size: .9rem; line-height: 1.65; outline: none; tab-size: 2; }
  &__output-head { padding-left: .5rem; }
  &__tabs { display: flex; min-width: 0; align-items: center; gap: .15rem; overflow-x: auto; }
  &__tab { min-height: 2.3rem; padding-inline: .8rem; border: 0; border-radius: .55rem; background: transparent; color: tone.muted(); font: inherit; font-size: .8rem; font-weight: 550; cursor: pointer; }
  &__tab:hover, &__tab--active { background: var(--color-primary); color: var(--color-primary-contrast); }
  &__preview, &__data { min-height: 0; flex: 1; overflow: auto; padding: 1.5rem; }
  &__data { margin: 0; background: #0d1117; color: #e6edf3; font-family: var(--font-family-mono); font-size: .82rem; line-height: 1.65; tab-size: 2; white-space: pre; }
  &__error { display: flex; flex-direction: column; gap: .5rem; margin: 1.5rem; padding: 1rem; border-radius: .75rem; background: color-mix(in srgb, var(--color-error), transparent 88%); color: var(--color-error); }
  &__note { margin: 1rem 0 0; color: tone.muted(); font-size: .8rem; }
  &__note-link { color: var(--color-foreground); }
  &__visually-hidden { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
}

@media (max-width: 54rem) { .playground-view { &__head { align-items: flex-start; flex-direction: column; } &__workspace { grid-template-columns: 1fr; height: auto; } &__pane { min-height: 28rem; } &__pane + &__pane { border-top: 1px solid color-mix(in srgb, var(--color-foreground), transparent 88%); border-left: 0; } } }
@media (max-width: 38rem) { .playground-view { &__head-actions { width: 100%; } &__select { min-width: 0; flex: 1; } &__summary { gap: .6rem 1rem; } &__pane { min-height: 24rem; } &__output-head { align-items: flex-start; flex-direction: column; padding-block: .5rem; } } }
</style>
