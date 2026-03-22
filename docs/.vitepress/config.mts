import { defineConfig } from "vitepress";

export default defineConfig({
  title: "solana-kiss",
  description: "No bloat, no dependency, full-featured Solana framework",
  themeConfig: {
    nav: [
      { text: "Guide", link: "/guide/001_getting_started" },
      {
        text: "GitHub",
        link: "https://github.com/crypto-vincent/solana-kiss",
      },
    ],
    sidebar: [
      {
        text: "Introduction",
        items: [
          { text: "Getting Started", link: "/guide/001_getting_started" },
        ],
      },
      {
        text: "Core API",
        items: [
          { text: "The Solana Class", link: "/guide/002_solana_class" },
          { text: "Public Keys", link: "/guide/003_pubkey" },
          { text: "Transactions", link: "/guide/004_transactions" },
          { text: "Instructions", link: "/guide/005_instructions" },
          { text: "Signers & Wallets", link: "/guide/006_signers_wallets" },
        ],
      },
      {
        text: "RPC & Network",
        items: [
          { text: "RPC Client", link: "/guide/007_rpc_client" },
          { text: "Execution & Blocks", link: "/guide/010_execution_blocks" },
        ],
      },
      {
        text: "IDL",
        items: [
          { text: "IDL Programs", link: "/guide/008_idl_programs" },
          { text: "IDL Types", link: "/guide/009_idl_types" },
        ],
      },
      {
        text: "Utilities",
        items: [
          { text: "SPL & Utilities", link: "/guide/011_spl_utilities" },
          { text: "Data Encoding", link: "/guide/012_data_encoding" },
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
