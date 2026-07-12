import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
import tailwindcss from "@tailwindcss/vite";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";

export default defineConfig({
  site: "https://wibrow.dev",
  integrations: [react(), mdx(), sitemap()],
  redirects: {
    "/til": "/posts",
  },
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": "/src",
        "@components": "/src/components",
        "@lib": "/src/lib",
      },
      dedupe: ["react", "react-dom"],
    },
    optimizeDeps: {
      include: ["react", "react-dom", "react-dom/client"],
    },
  },
  markdown: {
    shikiConfig: {
      themes: { light: "catppuccin-latte", dark: "catppuccin-mocha" },
      defaultColor: false,
      wrap: false,
    },
    rehypePlugins: [
      rehypeSlug,
      [
        rehypeAutolinkHeadings,
        {
          behavior: "wrap",
          properties: { className: ["heading-anchor"] },
        },
      ],
    ],
  },
});
