import { defineConfig } from "vitepress";

export default defineConfig({
  title: "solana-kiss",
  description: "A simple, elegant TypeScript library for Solana.",
  themeConfig: {
    nav: [
      { text: "API Reference", link: "/api/" },
      {
        text: "GitHub",
        link: "https://github.com/crypto-vincent/solana-kiss",
      },
    ],
    sidebar: {
      "/api/": [{ text: "API Reference", link: "/api/" }],
    },
    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/crypto-vincent/solana-kiss",
      },
    ],
    search: { provider: "local" },
    footer: {
      message: "Released under the MIT License.",
    },
  },
});
