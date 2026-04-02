import { defineConfig } from "vitepress";

export default defineConfig({
  description: "Full-featured Solana framework. No bloat, no dependency.",
  title: "solana-kiss 💋",
  base: "/solana-kiss/",
  head: [
    ["link", { rel: "icon", href: "/solana-kiss/favicon.ico" }],
    [
      "style",
      {},
      `
      .VPDoc div[class*="language-"] code { font-size: 0.8em; line-height: 1.6; }
      `,
    ],
  ],
  themeConfig: {
    search: { provider: "local", options: { detailedView: true } },
    nav: [
      { text: "Guide", link: "/guide/001_getting_started" },
      { text: "npm", link: "https://www.npmjs.com/package/solana-kiss" },
    ],
    sidebar: [
      {
        text: "Guide",
        items: [
          { text: "Getting Started", link: "/guide/001_getting_started" },
          { text: "The Solana Class", link: "/guide/002_solana_class" },
          { text: "Transactions", link: "/guide/004_transactions" },
          { text: "Signers & Wallets", link: "/guide/006_signers_wallets" },
        ],
      },
      {
        text: "API Reference",
        items: [
          { text: "Public Keys", link: "/guide/003_pubkey" },
          { text: "Instructions", link: "/guide/005_instructions" },
          { text: "RPC Client", link: "/guide/007_rpc_client" },
          { text: "IDL Programs", link: "/guide/008_idl_programs" },
          { text: "IDL Types", link: "/guide/009_idl_types" },
          { text: "Execution & Blocks", link: "/guide/010_execution_blocks" },
          { text: "SPL & Utilities", link: "/guide/011_spl_utilities" },
          { text: "Data Encoding", link: "/guide/012_data_encoding" },
        ],
      },
    ],
    socialLinks: [
      { icon: "github", link: "https://github.com/crypto-vincent/solana-kiss" },
    ],
    footer: {
      message: "Solana: Keep It Simple, Stupid. (KISS)",
    },
  },
});
