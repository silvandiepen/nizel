<template><section :class="bemm('', ['', filled ? 'filled' : ''])"><div :class="[bemm('inner'), 'container', wide ? 'container--wide' : '']"><header v-if="eyebrow || title || lede" :class="bemm('head')"><p v-if="eyebrow" :class="bemm('eyebrow')">{{ eyebrow }}</p><h2 v-if="title" :class="bemm('title')">{{ title }}</h2><p v-if="lede" :class="bemm('lede')">{{ lede }}</p></header><div :class="bemm('body')"><slot /></div></div></section></template>
<script setup lang="ts">
import { useBemm } from "bemm";
import type { PageSectionProps } from "./PageSection.model";
const bemm = useBemm("page-section", { includeBaseClass: true });
withDefaults(defineProps<PageSectionProps>(), { filled: false, wide: false });
</script>
<style lang="scss">
@use "@/styles/tone" as tone;
.page-section { padding-block: clamp(5rem, 9vw, 8rem); &--filled { background: tone.surface(); } &__inner, &__head, &__body { display: flex; flex-direction: column; } &__inner { gap: clamp(2.5rem, 5vw, 4rem); } &__head { gap: 1rem; } &__body { gap: 2rem; } &__eyebrow, &__title, &__lede { margin: 0; } &__eyebrow { color: tone.muted(); font-size: .625rem; font-weight: 600; letter-spacing: .045em; text-transform: uppercase; } &__title { max-width: 20ch; font-size: clamp(2.25rem, 5vw, 4.5rem); font-weight: 600; letter-spacing: -.04em; line-height: 1.02; text-wrap: balance; } &__lede { max-width: 58ch; color: tone.muted(); font-size: clamp(1.05rem, 2vw, 1.25rem); line-height: 1.6; } }
</style>
