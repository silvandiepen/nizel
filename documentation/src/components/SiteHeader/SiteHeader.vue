<template><header :class="bemm()"><div :class="bemm('bar')"><RouterLink :class="bemm('brand')" to="/"><img :class="bemm('logo')" :src="logo" alt="Nizel" /></RouterLink><div :class="bemm('end')"><nav :class="bemm('nav')" aria-label="Main navigation"><RouterLink v-for="link in links" :key="link.to" :class="bemm('link')" :to="link.to"><OpenIcon :name="link.icon" />{{ link.label }}</RouterLink><a :class="[bemm('link'), bemm('github')]" href="https://github.com/silvandiepen/nizel"><OpenIcon name="code" />GitHub</a></nav><button :class="bemm('theme')" type="button" :aria-label="nextLabel" :title="`${nextLabel}. Current: ${mode}`" @click="cycle"><OpenIcon :name="mode === 'dark' ? 'moon' : mode === 'light' ? 'sun' : 'light-dark-mode-2'" /></button></div></div></header></template>
<script setup lang="ts">
import { useBemm } from "bemm";
import { RouterLink } from "vue-router";
import logo from "../../../media/logo.svg?url";
import type { SiteHeaderLink } from "./SiteHeader.model";
import { useTheme } from "../../composables/useTheme/useTheme";
import OpenIcon from "@/components/OpenIcon";
const bemm = useBemm("site-header", { includeBaseClass: true });
const links: SiteHeaderLink[] = [{ label: "Docs", to: "/docs", icon: "book" }, { label: "Features", to: "/features", icon: "tree" }, { label: "Plugins", to: "/plugins", icon: "code" }, { label: "Playground", to: "/play", icon: "terminal" }];
const { mode, nextLabel, cycle } = useTheme();
</script>
<style lang="scss">
@use "@/styles/tone" as tone;
.site-header {
  position: sticky;
  top: 0;
  z-index: 20;
  padding-block: .65rem;
  background: color-mix(in srgb, var(--color-background) 88%, transparent);
  backdrop-filter: blur(18px);

  &__bar { display: flex; width: calc(100% - (var(--space) * 2)); max-width: 70rem; min-height: 3.4rem; align-items: center; justify-content: space-between; gap: 1rem; margin-inline: auto; padding-inline: var(--space); border-radius: 1rem; background: tone.surface(); }
  &__brand { display: inline-flex; flex: none; min-height: 2.5rem; align-items: center; }
  &__logo { width: 4.75rem; color: var(--color-foreground); filter: var(--logo-filter, none); }
  &__end, &__nav { display: flex; min-width: 0; align-items: center; }
  &__end { justify-content: flex-end; gap: .35rem; }
  &__nav { gap: .1rem; overflow-x: auto; scrollbar-width: none; }
  &__link { display: inline-flex; min-height: 2.35rem; align-items: center; gap: .35rem; padding-inline: .8rem; border-radius: 999px; color: tone.muted(); font-size: .82rem; font-weight: 550; text-decoration: none; white-space: nowrap; &:hover { background: var(--color-primary); color: var(--color-primary-contrast); } &.router-link-active { background: var(--color-primary); color: var(--color-primary-contrast); } }
  &__theme { display: inline-flex; width: 2.35rem; min-width: 2.35rem; height: 2.35rem; align-items: center; justify-content: center; padding: 0; border: 0; border-radius: 50%; background: var(--color-background); color: var(--color-foreground); cursor: pointer; &:hover { background: var(--color-primary); color: var(--color-primary-contrast); } }
}

@media (max-width: 38rem) {
  .site-header { position: relative; &__bar { gap: .5rem; } &__end { min-width: 0; } &__nav { justify-content: flex-end; } &__link { min-height: 2.25rem; padding-inline: .55rem; font-size: .72rem; } &__github { display: none; } &__theme { width: 2.25rem; min-width: 2.25rem; height: 2.25rem; } }
}
</style>
