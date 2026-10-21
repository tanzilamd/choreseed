import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
export default defineConfig({
  plugins: [
    react(),
    {
      name: "offline-static-assets",
      closeBundle() {
        const assets = [
          "/",
          "/icon.svg",
          ...readdirSync("dist/web/assets").map((name) => "/assets/" + name),
        ];
        const template = readFileSync("public/sw.js", "utf8");
        const marker = /const ASSETS = \[\];?\s*\/\* ASSET_LIST \*\//;
        if (!marker.test(template))
          throw new Error("Service worker asset marker is missing.");
        writeFileSync(
          "dist/web/sw.js",
          template.replace(marker, `const ASSETS = ${JSON.stringify(assets)};`),
        );
      },
    },
  ],
  build: { outDir: "dist/web", emptyOutDir: true },
  server: {
    proxy: {
      "/api": "http://127.0.0.1:3000",
      "/healthz": "http://127.0.0.1:3000",
    },
  },
});
