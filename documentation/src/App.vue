<template>
  <a class="skip-link" href="#main">Skip to content</a>
  <SiteHeader />
  <main id="main" :class="bemm('main')">
    <RouterView />
  </main>
  <SiteFooter />
</template>

<script setup lang="ts">
import { useBemm } from "bemm";
import { RouterView } from "vue-router";

import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";

const bemm = useBemm("app", { includeBaseClass: true });
</script>

<style lang="scss">
.app {
  &__main { min-height: 65vh; }
}
</style>
