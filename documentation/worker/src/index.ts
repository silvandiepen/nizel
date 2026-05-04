import type { WorkerHandler } from "./index.model";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Try exact path first, then with /index.html
    for (const candidate of getCandidates(url.pathname)) {
      const assetUrl = new URL(request.url);
      assetUrl.pathname = candidate;
      const response = await env.ASSETS.fetch(assetUrl);
      if (response.status !== 404) return response;
    }

    return new Response("Not Found", { status: 404 });
  },
} satisfies WorkerHandler<Env>;

function getCandidates(pathname: string): string[] {
  if (pathname === "/") return ["/index.html"];
  if (pathname.endsWith("/")) return [`${pathname}index.html`];
  const last = pathname.split("/").pop() ?? "";
  if (last.includes(".")) return [pathname];
  return [`${pathname}/index.html`, pathname];
}
