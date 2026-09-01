<template>
  <footer :class="bemm()">
    <div :class="[bemm('panel'), 'container', 'container--wide']">
      <div :class="bemm('main')">
        <section :class="bemm('about')" aria-labelledby="footer-project">
          <RouterLink :class="bemm('brand')" to="/" aria-label="Nizel documentation home">
            <img :class="bemm('logo')" :src="logo" alt="Nizel" />
          </RouterLink>
          <h2 id="footer-project" :class="bemm('visually-hidden')">About Nizel</h2>
          <p :class="bemm('description')">A CommonMark parser and content-processing library for TypeScript.</p>
          <p :class="bemm('compatibility')">Node.js · Browsers · Workers · Native WebViews</p>
        </section>

        <nav v-for="group in groups" :key="group.label" :class="bemm('group')" :aria-label="group.label">
          <h2 :class="bemm('group-title')">{{ group.label }}</h2>
          <RouterLink v-for="link in group.links" :key="link.to" :class="bemm('link')" :to="link.to">{{ link.label }}</RouterLink>
        </nav>

        <nav :class="bemm('group')" aria-label="Project links">
          <h2 :class="bemm('group-title')">Project</h2>
          <a :class="bemm('link')" href="https://www.npmjs.com/package/nizel">npm package <OpenIcon name="arrow-up-right" /></a>
          <a :class="bemm('link')" href="https://github.com/silvandiepen/nizel">GitHub <OpenIcon name="arrow-up-right" /></a>
          <RouterLink :class="bemm('link')" to="/support">Support</RouterLink>
        </nav>
      </div>

      <div :class="bemm('bottom')">
        <p :class="bemm('license')">Nizel is open-source software available under the MIT License.</p>
        <nav :class="bemm('legal')" aria-label="Legal">
          <RouterLink :class="bemm('legal-link')" to="/privacy-policy">Privacy</RouterLink>
          <RouterLink :class="bemm('legal-link')" to="/terms">Terms</RouterLink>
        </nav>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { useBemm } from "bemm";
import { RouterLink } from "vue-router";
import logo from "../../../media/logo.svg?url";
import type { SiteFooterGroup } from "./SiteFooter.model";
import OpenIcon from "@/components/OpenIcon";

const bemm = useBemm("site-footer", { includeBaseClass: true });

const groups: SiteFooterGroup[] = [
  { label: "Documentation", links: [{ label: "Getting started", to: "/guides/getting-started" }, { label: "API reference", to: "/guides/api" }, { label: "Result", to: "/guides/result" }, { label: "Safety", to: "/guides/safety" }] },
  { label: "Extend", links: [{ label: "Plugins", to: "/plugins/index" }, { label: "Transforms", to: "/guides/transforms" }, { label: "Templates", to: "/guides/template" }, { label: "Presets", to: "/guides/presets" }] },
];
</script>

<style lang="scss">
@use "@/styles/tone" as tone;

.site-footer {
  padding-block: 2rem;

  &__panel { border-radius: 1.5rem; background: tone.surface(); }
  &__main { display: grid; grid-template-columns: minmax(15rem, 1.6fr) repeat(3, minmax(9rem, 1fr)); gap: clamp(2rem, 5vw, 4rem); padding-block: clamp(2.5rem, 5vw, 4rem); }
  &__about { display: flex; flex-direction: column; align-items: flex-start; }
  &__brand { display: inline-flex; color: var(--color-foreground); }
  &__logo { width: 6.5rem; filter: var(--logo-filter, none); }
  &__description { max-width: 28ch; margin: 1.25rem 0 0; font-size: 1rem; font-weight: 550; }
  &__compatibility { max-width: 30ch; margin: .75rem 0 0; color: tone.muted(); font-size: .82rem; }
  &__group { display: flex; flex-direction: column; align-items: flex-start; gap: .55rem; }
  &__group-title { margin: 0 0 .4rem; font-size: .8rem; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; }
  &__link { display: inline-flex; align-items: center; gap: .35rem; color: tone.muted(); font-size: .9rem; text-decoration: none; }
  &__link:hover { color: var(--color-foreground); text-decoration: underline; text-underline-offset: .2em; }
  &__bottom { display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; padding-block: 1.25rem 1.5rem; border-top: 1px solid color-mix(in srgb, var(--color-foreground), transparent 88%); }
  &__license { margin: 0; color: tone.muted(); font-size: .78rem; }
  &__legal { display: flex; gap: 1.25rem; }
  &__legal-link { color: tone.muted(); font-size: .78rem; text-decoration: none; }
  &__legal-link:hover { color: var(--color-foreground); }
  &__visually-hidden { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
}

@media (max-width: 62rem) {
  .site-footer { &__main { grid-template-columns: 1.4fr repeat(2, 1fr); } &__about { grid-column: 1 / -1; } }
}

@media (max-width: 38rem) {
  .site-footer { &__main { grid-template-columns: repeat(2, 1fr); } &__group:last-child { grid-column: 1 / -1; } &__bottom { align-items: flex-start; flex-direction: column; } }
}
</style>
