import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import site from "./config/site.json" with { type: "json" };

export default defineConfig({
  site: site.url,
  integrations: [sitemap()],
});
