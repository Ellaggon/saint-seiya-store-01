// @ts-check
import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  output: "server",
  prefetch: {
    defaultStrategy: "hover",
    prefetchAll: false,
  },

  adapter: vercel({
    webAnalytics: {
      enabled: true,
    },
  }),

  vite: {
    envPrefix: ["PUBLIC_", "NEXT_PUBLIC_"],
    plugins: [tailwindcss()],
  },
});
