<template><component :is="tag" :to="to" :href="href" :class="bemm('', variant)"><OpenIcon v-if="icon" :name="icon" /><slot /></component></template>
<script setup lang="ts">
import { computed } from "vue";
import { useBemm } from "bemm";
import { RouterLink } from "vue-router";
import type { ActionButtonProps } from "./ActionButton.model";
import OpenIcon from "@/components/OpenIcon";
const bemm = useBemm("action-button", { includeBaseClass: true });
const props = withDefaults(defineProps<ActionButtonProps>(), { variant: "secondary" });
const tag = computed(() => props.to ? RouterLink : "a");
</script>
<style lang="scss">
@use "@/styles/tone" as tone;
.action-button { display: inline-flex; align-items: center; justify-content: center; gap: .45rem; min-height: 2.75rem; padding-inline: var(--space-l); border-radius: 999px; color: var(--color-foreground); font-weight: 600; text-decoration: none; transition: background var(--transition); &--secondary { background: tone.surface(); &:hover { background: var(--color-secondary); color: var(--color-secondary-contrast); } } &--primary { background: var(--color-primary); color: var(--color-primary-contrast); &:hover { background: var(--color-secondary); color: var(--color-secondary-contrast); } } }
</style>
