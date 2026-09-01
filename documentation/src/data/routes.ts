import type { SiteRoute } from "./routes.model";

export const SITE_URL = "https://nizel.hakobs.com";

export const STATIC_ROUTES: SiteRoute[] = [
  { path: "/", title: "Nizel documentation", description: "Documentation for Nizel, a CommonMark parser and content-processing library for TypeScript.", navLabel: "Home", priority: 1, changefreq: "weekly" },
  { path: "/docs", title: "Documentation — Nizel", description: "Learn how to parse, render, transform, and extend Markdown with Nizel.", navLabel: "Docs", priority: 0.9, changefreq: "weekly" },
  { path: "/plugins", title: "Plugins — Nizel", description: "First-party plugins for code, math, diagrams, typography, metadata, and more.", navLabel: "Plugins", priority: 0.8, changefreq: "monthly" },
  { path: "/play", title: "Playground — Nizel", description: "Inspect rendered HTML, metadata, navigation, assets, text, and AST output.", navLabel: "Playground", priority: 0.9, changefreq: "monthly" },
  { path: "/support", title: "Support — Nizel", description: "Get help using Nizel or report a problem.", priority: 0.5, changefreq: "yearly" },
  { path: "/privacy-policy", title: "Privacy policy — Nizel", description: "How the Nizel website handles data.", priority: 0.3, changefreq: "yearly" },
  { path: "/terms", title: "Terms and conditions — Nizel", description: "Terms for using the Nizel website and software.", priority: 0.3, changefreq: "yearly" },
];

/** Finds static metadata for one route. */
export function findRoute(path: string): SiteRoute | undefined {
  return STATIC_ROUTES.find((route) => route.path === path);
}
