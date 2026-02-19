import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type DefaultTheme } from "vitepress";

type NavEntry = {
  title: string;
  kind?: number;
  path?: string;
  isDeprecated?: boolean;
  children?: NavEntry[];
};

function buildSidebar(entries: NavEntry[], base: string): DefaultTheme.SidebarItem[] {
  return entries.map((entry) => {
    if (entry.children && entry.children.length > 0) {
      return {
        text: entry.title,
        collapsed: false,
        items: buildSidebar(entry.children, base),
      };
    }
    const link = entry.path
      ? `${base}/${entry.path.replace(/\.md$/, "")}`
      : undefined;
    return { text: entry.title, link };
  });
}

const navJsonPath = resolve(__dirname, "typedoc-navigation.json");
let navJson: NavEntry[];
try {
  navJson = JSON.parse(readFileSync(navJsonPath, "utf-8")) as NavEntry[];
} catch {
  throw new Error(
    `Could not read ${navJsonPath}. Run "npm run docs:generate" first to generate the API docs.`,
  );
}

export default defineConfig({
  title: "solana-kiss",
  description: "No bloat, no dependency, full-featured Solana framework",
  base: "/",

  themeConfig: {
    logo: "https://solana.com/favicon.ico",

    nav: [
      { text: "Home", link: "/" },
      { text: "API Reference", link: "/api/Solana" },
    ],

    sidebar: {
      "/api/": [
        {
          text: "API Reference",
          items: buildSidebar(navJson, "/api"),
        },
      ],
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
