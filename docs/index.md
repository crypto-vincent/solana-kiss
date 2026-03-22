---
layout: home

hero:
  name: "solana-kiss"
  text: Solana for TypeScript
  tagline: No bloat. No dependency.<br/>Encoding, Decoding, Signing.<br/>RPCs, IDLs and browser wallets<br/>Nothing less, nothing more.

  image:
    src: /hero.png

  actions:
    - theme: brand
      text: Get Started
      link: /guide/001_getting_started
    - theme: alt
      text: View on GitHub
      link: https://github.com/crypto-vincent/solana-kiss

features:
  - title: Zero dependencies
    icon: 📦
    details: Pure TypeScript with no runtime dependencies. Only the Web Crypto API and fetch are needed.
  - title: Anchor IDL support
    icon: ⚓
    details: Parse, load, encode, and decode any Anchor program's accounts and instructions.
  - title: Bytemuck support
    icon: ✨
    details: Encode end decode accounts and instructions that uses rust Bytemuck serialization.
  - title: Composable RPC
    icon: 🧩
    details: Middleware wrappers for timeouts, retries, rate limiting, and concurrency – compose freely.
  - title: Browser wallet adapters
    icon: 👛
    details: Wallet Standard–compatible adapter discovery and reactive account lists out of the box.
  - title: Execution tracing
    icon: 🔍
    details: Structured call-stack parsing from program logs. Inspect every CPI invocation and its return data.
---
