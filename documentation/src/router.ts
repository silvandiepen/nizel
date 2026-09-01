import { createRouter, createWebHistory } from "vue-router";

import { findRoute } from "@/data/routes";
import DocumentationView from "@/views/DocumentationView.vue";
import HomeView from "@/views/HomeView.vue";
import LegalView from "@/views/LegalView.vue";
import PlaygroundView from "@/views/PlaygroundView.vue";
import PluginsView from "@/views/PluginsView.vue";
import FeaturesView from "@/views/FeaturesView.vue";
import SupportView from "@/views/SupportView.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: HomeView },
    { path: "/play", component: PlaygroundView },
    { path: "/features", component: FeaturesView },
    { path: "/docs", redirect: "/guides/getting-started" },
    { path: "/plugins", component: PluginsView },
    { path: "/:section(guides|plugins)/:slug?", component: DocumentationView },
    { path: "/support", component: SupportView },
    { path: "/privacy-policy", component: LegalView, props: { document: "privacy" } },
    { path: "/terms", component: LegalView, props: { document: "terms" } },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
  scrollBehavior: () => ({ top: 0 }),
});

router.afterEach((to) => {
  const meta = findRoute(to.path);
  if (meta) {
    document.title = meta.title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", meta.description);
  }
});
