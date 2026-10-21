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
        writeFileSync(
          "dist/web/sw.js",
          readFileSync("public/sw.js", "utf8").replace(
            "[] /* ASSET_LIST */",
            JSON.stringify(assets),
          ),
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
