<template>
  <main :class="[bemm(), 'container', 'container--wide']">
    <header :class="bemm('intro')">
      <p :class="bemm('label')">Nizel documentation</p>
      <h1 :class="bemm('title')">Markdown parsing and content processing for TypeScript.</h1>
      <p :class="bemm('summary')">
        Nizel parses CommonMark into safe HTML and a structured result containing
        metadata, headings, links, images, text, reading time, and a stable AST.
        It runs in Node.js, browsers, Workers, and native WebViews.
      </p>
      <div :class="bemm('intro-links')">
        <RouterLink :class="bemm('primary-link')" to="/guides/getting-started">Getting started</RouterLink>
        <RouterLink :class="bemm('text-link')" to="/features">Features</RouterLink>
        <RouterLink :class="bemm('text-link')" to="/play">Playground</RouterLink>
      </div>
    </header>

    <section :class="bemm('quickstart')" aria-labelledby="quickstart-title">
      <div :class="bemm('section-copy')">
        <p :class="bemm('section-label')">Quick start</p>
        <h2 id="quickstart-title" :class="bemm('section-title')">Install and parse</h2>
        <p :class="bemm('section-summary')">The default parser follows CommonMark 0.31.2 and returns a single application-ready result.</p>
        <nav :class="bemm('related')" aria-label="Quick start documentation">
          <RouterLink :class="bemm('related-link')" to="/guides/getting-started"><span>Installation and setup</span><OpenIcon name="arrow-right" /></RouterLink>
          <RouterLink :class="bemm('related-link')" to="/guides/result"><span>Result reference</span><OpenIcon name="arrow-right" /></RouterLink>
          <RouterLink :class="bemm('related-link')" to="/guides/safety"><span>Safety and HTML</span><OpenIcon name="arrow-right" /></RouterLink>
        </nav>
      </div>
      <div :class="bemm('code-stack')">
        <div :class="bemm('command')"><code>npm install nizel</code><button :class="bemm('copy')" type="button" @click="copyInstall"><OpenIcon name="clipboard" />{{ copied ? "Copied" : "Copy" }}</button></div>
        <pre :class="bemm('code')"><code>import { nizel } from "nizel";

const result = await nizel.parse(source);

result.html;
result.meta;
result.toc;
result.links;
result.images;
result.readingTime;
result.ast;</code></pre>
      </div>
    </section>

    <section :class="bemm('section')" aria-labelledby="features-title">
      <div :class="bemm('section-head')">
        <div>
          <p :class="bemm('section-label')">Features</p>
          <h2 id="features-title" :class="bemm('section-title')">Included in the processing pipeline</h2>
        </div>
        <RouterLink :class="bemm('section-link')" to="/guides/index">All guides <OpenIcon name="arrow-right" /></RouterLink>
      </div>
      <div :class="bemm('feature-grid')">
        <RouterLink v-for="feature in features" :key="feature.to" :class="bemm('feature')" :to="feature.to">
          <h3 :class="bemm('feature-title')">{{ feature.title }}</h3>
          <p :class="bemm('feature-copy')">{{ feature.copy }}</p>
          <span :class="bemm('feature-more')">Read guide <OpenIcon name="arrow-right" /></span>
        </RouterLink>
      </div>
    </section>

    <section :class="bemm('reference')" aria-labelledby="reference-title">
      <div :class="bemm('section-head')">
        <div>
          <p :class="bemm('section-label')">Reference</p>
          <h2 id="reference-title" :class="bemm('section-title')">Documentation by task</h2>
        </div>
      </div>
      <div :class="bemm('reference-grid')">
        <section v-for="group in referenceGroups" :key="group.title" :class="bemm('reference-group')">
          <h3 :class="bemm('reference-title')">{{ group.title }}</h3>
          <RouterLink v-for="item in group.items" :key="item.to" :class="bemm('reference-link')" :to="item.to">{{ item.label }}<OpenIcon name="arrow-right" /></RouterLink>
        </section>
      </div>
    </section>

    <section :class="bemm('facts')" aria-label="Compatibility and conformance">
      <div v-for="fact in facts" :key="fact.label" :class="bemm('fact')"><strong :class="bemm('fact-value')">{{ fact.value }}</strong><span :class="bemm('fact-label')">{{ fact.label }}</span></div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useBemm } from "bemm";
import { RouterLink } from "vue-router";
import OpenIcon from "@/components/OpenIcon";

const bemm = useBemm("home-view", { includeBaseClass: true });
const copied = ref(false);

const features = [
  { title: "Structured result", copy: "HTML, frontmatter, TOC, links, images, text, excerpts, reading time, and AST from one parse.", to: "/guides/result" },
  { title: "Frontmatter and templates", copy: "Parse document metadata and interpolate runtime values with built-in formatting filters.", to: "/guides/frontmatter" },
  { title: "Elements and rendering", copy: "Map Markdown elements, attributes, and custom blocks to application-specific output.", to: "/guides/elements" },
  { title: "Transforms", copy: "Visit and modify the stable AST before rendering without depending on an internal parser tree.", to: "/guides/transforms" },
  { title: "Plugins", copy: "Add GFM, syntax highlighting, math, diagrams, citations, footnotes, sanitizing, and more.", to: "/plugins/index" },
  { title: "Portable documents", copy: "Serialize a versioned document for transport or storage and render it in another environment.", to: "/guides/nizel-format" },
];

const referenceGroups = [
  { title: "Use Nizel", items: [{ label: "Getting started", to: "/guides/getting-started" }, { label: "Pipeline", to: "/guides/pipeline" }, { label: "API", to: "/guides/api" }, { label: "Styling output", to: "/guides/styling" }] },
  { title: "Extend Nizel", items: [{ label: "Plugins", to: "/guides/plugins" }, { label: "Presets", to: "/guides/presets" }, { label: "Templates", to: "/guides/template" }, { label: "Filters", to: "/guides/filters" }] },
  { title: "Integrate Nizel", items: [{ label: "Browser and Workers", to: "/guides/getting-started" }, { label: "NizelKit", to: "/guides/nizel-kit" }, { label: "HTML to Markdown", to: "/guides/html-to-markdown" }, { label: "Testing", to: "/guides/testing" }] },
];

const facts = [
  { value: "0.31.2", label: "CommonMark" },
  { value: "652 / 652", label: "spec tests" },
  { value: "TypeScript", label: "typed API" },
  { value: "Web + native", label: "runtime support" },
];

async function copyInstall() {
  await navigator.clipboard.writeText("npm install nizel");
  copied.value = true;
  window.setTimeout(() => { copied.value = false; }, 1500);
}
</script>

<style lang="scss">
@use "@/styles/tone" as tone;

.home-view {
  padding-block: clamp(3rem, 7vw, 6rem) 5rem;

  &__intro { max-width: 58rem; }
  &__label, &__section-label { margin: 0 0 .6rem; color: tone.muted(); font-size: .625rem; font-weight: 600; letter-spacing: .045em; text-transform: uppercase; }
  &__title { max-width: 18ch; margin: 0; font-size: clamp(2.5rem, 6vw, 5rem); font-weight: 600; letter-spacing: -.045em; line-height: 1; }
  &__summary { max-width: 65ch; margin: 1.5rem 0 0; color: tone.muted(); font-size: clamp(1.05rem, 2vw, 1.25rem); }
  &__intro-links { display: flex; flex-wrap: wrap; align-items: center; gap: .75rem 1.5rem; margin-top: 2rem; }
  &__primary-link { padding: .75rem 1.1rem; border-radius: .7rem; background: var(--color-foreground); color: var(--color-background); font-weight: 600; text-decoration: none; }
  &__text-link, &__section-link { display: inline-flex; align-items: center; gap: .35rem; color: var(--color-foreground); font-weight: 600; text-underline-offset: .2em; }

  &__quickstart { display: grid; grid-template-columns: minmax(16rem, .75fr) minmax(0, 1.25fr); gap: clamp(2rem, 7vw, 6rem); margin-top: clamp(4rem, 9vw, 8rem); padding: clamp(1.5rem, 4vw, 3rem); border-radius: 1.5rem; background: tone.surface(); }
  &__section-copy { display: flex; flex-direction: column; align-items: flex-start; }
  &__section-title { max-width: 20ch; margin: 0; font-size: clamp(1.8rem, 4vw, 3rem); font-weight: 600; letter-spacing: -.035em; line-height: 1.08; }
  &__section-summary { margin: 1rem 0 0; color: tone.muted(); }
  &__related { display: flex; flex-direction: column; gap: .55rem; margin-top: auto; padding-top: 2rem; }
  &__related-link { display: flex; align-items: center; justify-content: space-between; gap: 1rem; color: var(--color-foreground); font-weight: 550; text-underline-offset: .2em; }
  &__code-stack { min-width: 0; }
  &__command { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: .8rem 1rem; border-radius: .75rem .75rem 0 0; background: #25292f; color: #e6edf3; font-family: var(--font-family-mono); }
  &__command code { font-family: inherit; }
  &__copy { display: inline-flex; align-items: center; gap: .4rem; border: 0; background: transparent; color: inherit; cursor: pointer; font: inherit; font-size: .78rem; opacity: .7; }
  &__code { overflow: auto; margin: .2rem 0 0; padding: 1.5rem; border-radius: 0 0 .75rem .75rem; background: #0d1117; color: #e6edf3; font-family: var(--font-family-mono); font-size: .9rem; line-height: 1.7; }

  &__section, &__reference { margin-top: clamp(5rem, 10vw, 9rem); }
  &__section-head { display: flex; align-items: end; justify-content: space-between; gap: 2rem; margin-bottom: 2rem; }
  &__feature-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; }
  &__feature { display: flex; min-height: 15rem; flex-direction: column; padding: 1.5rem; border-radius: 1rem; background: tone.surface(); color: var(--color-foreground); text-decoration: none; }
  &__feature:hover { background: var(--color-primary); color: var(--color-primary-contrast); }
  &__feature-title, &__feature-copy { margin: 0; }
  &__feature-title { font-size: 1.2rem; }
  &__feature-copy { margin-top: .75rem; color: tone.muted(); }
  &__feature-more { display: inline-flex; align-items: center; gap: .4rem; margin-top: auto; padding-top: 1.5rem; font-size: .9rem; font-weight: 600; }
  &__feature:hover &__feature-copy, &__feature:hover &__feature-more { color: var(--color-primary-contrast); }

  &__reference-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border-block: 1px solid tone.selected(); }
  &__reference-group { padding: 2rem 0; }
  &__reference-group + &__reference-group { padding-left: 2rem; border-left: 1px solid tone.selected(); }
  &__reference-title { margin: 0 0 1rem; font-size: 1rem; }
  &__reference-link { display: flex; justify-content: space-between; gap: 1rem; padding: .55rem 1.5rem .55rem 0; color: tone.muted(); text-decoration: none; }
  &__reference-link:hover { color: var(--color-foreground); }
  &__facts { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-top: 5rem; padding-top: 2rem; border-top: 1px solid tone.selected(); }
  &__fact { display: flex; flex-direction: column; }
  &__fact-value { font-size: 1.1rem; }
  &__fact-label { color: tone.muted(); font-size: .85rem; }
}

@media (max-width: 54rem) {
  .home-view { &__quickstart { grid-template-columns: 1fr; } &__feature-grid { grid-template-columns: repeat(2, 1fr); } &__related { margin-top: 0; } }
}

@media (max-width: 38rem) {
  .home-view { &__feature-grid, &__reference-grid, &__facts { grid-template-columns: 1fr; } &__feature { min-height: 12rem; } &__section-head { align-items: flex-start; flex-direction: column; } &__reference-group + &__reference-group { padding-left: 0; border-left: 0; border-top: 1px solid tone.selected(); } &__facts { grid-template-columns: repeat(2, 1fr); } }
}
</style>
