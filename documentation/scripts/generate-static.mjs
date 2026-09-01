import { mkdir, readdir, writeFile } from "node:fs/promises";
import { basename } from "node:path";

const siteUrl = "https://nizel.hakobs.com";
const routes = ["/", "/docs", "/plugins", "/play", "/support", "/privacy-policy", "/terms"];

for (const group of ["guides", "plugins"]) {
  for (const file of await readdir(new URL(`../${group}/`, import.meta.url))) {
    if (!file.endsWith(".md")) continue;
    const slug = basename(file, ".md");
    routes.push(`/${group}/${slug === "README" ? "index" : slug}`);
  }
}

const today = new Date().toISOString().slice(0, 10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map((path) => `  <url><loc>${siteUrl}${path}</loc><lastmod>${today}</lastmod></url>`).join("\n")}\n</urlset>\n`;
const robots = `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`;
const llms = `# Nizel\n\nNizel is a Markdown content processor for modern applications. It returns safe HTML, text, metadata, navigation, links, images, reading time, and a stable AST.\n\nDocumentation: ${siteUrl}/docs\nGitHub: https://github.com/silvandiepen/nizel\n`;

await mkdir(new URL("../dist/", import.meta.url), { recursive: true });
await writeFile(new URL("../dist/sitemap.xml", import.meta.url), sitemap);
await writeFile(new URL("../dist/robots.txt", import.meta.url), robots);
await writeFile(new URL("../dist/llms.txt", import.meta.url), llms);
