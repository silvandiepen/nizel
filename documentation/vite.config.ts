import { fileURLToPath, URL } from "node:url";

import { ui } from "@sil/ui/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [vue(), ui()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  assetsInclude: ["**/*.md"],
  css: { preprocessorOptions: { scss: { api: "modern-compiler" } } },
  build: {
    rollupOptions: {
      output: {
        chunkFileNames: "assets/c/[hash].js",
        entryFileNames: "assets/e/[hash].js",
        assetFileNames: (info) => info.names?.[0]?.endsWith(".css") ? "assets/s/[hash][extname]" : "assets/m/[hash][extname]",
      },
    },
  },
  test: { environment: "happy-dom", include: ["src/**/*.test.ts"] },
});
