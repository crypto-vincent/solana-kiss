import { defineConfig } from "vitepress";

export default defineConfig({
  title: "solana-kiss",
  description: "No bloat, no dependency, full-featured Solana framework",
  themeConfig: {
    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      {
        text: "GitHub",
        link: "https://github.com/crypto-vincent/solana-kiss",
      },
    ],
    sidebar: [
      {
        text: "Introduction",
        items: [{ text: "Getting Started", link: "/guide/getting-started" }],
      },
      {
        text: "Core API",
        items: [
          { text: "The Solana Class", link: "/guide/solana-class" },
          { text: "Public Keys", link: "/guide/pubkey" },
          { text: "Transactions", link: "/guide/transactions" },
          { text: "Instructions", link: "/guide/instructions" },
          { text: "Signers & Wallets", link: "/guide/signers-wallets" },
        ],
      },
      {
        text: "RPC & Network",
        items: [
          { text: "RPC Client", link: "/guide/rpc-client" },
          { text: "Execution & Blocks", link: "/guide/execution-blocks" },
        ],
      },
      {
        text: "IDL",
        items: [
          { text: "IDL Programs", link: "/guide/idl-programs" },
          { text: "IDL Types", link: "/guide/idl-types" },
        ],
      },
      {
        text: "Utilities",
        items: [
          { text: "SPL & Utilities", link: "/guide/spl-utilities" },
          { text: "Data Encoding", link: "/guide/data-encoding" },
        ],
      },
    ],
    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/crypto-vincent/solana-kiss",
      },
    ],
    footer: {
      message: "Released under the MIT License.",
    },
  },
});
