// @ts-check
import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: process.env.SITE_URL ?? "https://saint-seiya-store-01.vercel.app",
  output: "server",
  security: {
    allowedDomains: [
      {
        protocol: "https",
        hostname: "saint-seiya-store-01.vercel.app",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "4321",
      },
    ],
  },
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
