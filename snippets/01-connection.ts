/**
 * Basic Connection Setup Examples
 * 
 * This snippet demonstrates different ways to connect to the Solana blockchain
 * using solana-kiss.
 */

import { Solana, rpcHttpFromUrl, urlRpcPublicDevnet } from "solana-kiss";

// Example 1: Connect using network moniker (simplest)
function connectWithMoniker() {
  // Connect to devnet
  const solana = new Solana("devnet");
  
  // Connect to mainnet
  const solanaMainnet = new Solana("mainnet");
  
  // Connect to testnet
  const solanaTestnet = new Solana("testnet");
  
  return solana;
}

// Example 2: Connect with custom RPC URL
function connectWithCustomUrl() {
  const solana = new Solana("https://api.mainnet-beta.solana.com");
  return solana;
}

// Example 3: Connect with custom RPC configuration
function connectWithRpcConfig() {
  // Create RPC client with custom settings
  const rpcHttp = rpcHttpFromUrl(urlRpcPublicDevnet, {
    commitment: "confirmed", // or "finalized", "processed"
    rpcRequestTimeoutMs: 30000, // 30 second timeout
  });
  
  const solana = new Solana(rpcHttp);
  return solana;
}

// Example 4: Connect with custom options
function connectWithOptions() {
  const solana = new Solana("devnet", {
    // Cache recent blockhash for faster transaction building
    recentBlockHashCacheDurationMs: 15000, // 15 seconds (default)
  });
  
  return solana;
}

// Example 5: Get the underlying RPC client
async function getRpcClient() {
  const solana = new Solana("devnet");
  
  // Access the RPC client for lower-level operations
  const rpcHttp = solana.getRpcHttp();
  
  console.log("Connected to:", rpcHttp.url);
  
  return rpcHttp;
}

// Example 6: Get recent blockhash (cached)
async function getRecentBlockHash() {
  const solana = new Solana("devnet");
  
  // Get a recent blockhash - cached for performance
  const blockHash = await solana.getRecentBlockHash();
  
  console.log("Recent blockhash:", blockHash);
  
  return blockHash;
}

// Main example runner
async function main() {
  console.log("=== Solana Connection Examples ===\n");
  
  console.log("1. Connecting with moniker...");
  const solana1 = connectWithMoniker();
  console.log("   ✓ Connected\n");
  
  console.log("2. Connecting with custom URL...");
  const solana2 = connectWithCustomUrl();
  console.log("   ✓ Connected\n");
  
  console.log("3. Connecting with RPC config...");
  const solana3 = connectWithRpcConfig();
  console.log("   ✓ Connected\n");
  
  console.log("4. Connecting with options...");
  const solana4 = connectWithOptions();
  console.log("   ✓ Connected\n");
  
  console.log("5. Getting RPC client...");
  await getRpcClient();
  console.log("   ✓ RPC client retrieved\n");
  
  console.log("6. Getting recent blockhash...");
  await getRecentBlockHash();
  console.log("   ✓ Blockhash retrieved\n");
  
  console.log("All connection examples completed!");
}

// Uncomment to run examples:
// main().catch(console.error);
