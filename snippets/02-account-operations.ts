/**
 * Account Operations Examples
 * 
 * This snippet demonstrates how to fetch, decode, and work with Solana accounts
 * using solana-kiss.
 */

import {
  Solana,
  pubkeyFromBase58,
  pubkeyToBase58,
  Pubkey,
} from "solana-kiss";

// Example 1: Fetch and decode an account
async function fetchAndDecodeAccount(accountAddress: Pubkey) {
  const solana = new Solana("devnet");
  
  // Automatically infer the program and decode the account
  const account = await solana.getAndInferAndDecodeAccount(accountAddress);
  
  console.log("Account Information:");
  console.log("  Address:", pubkeyToBase58(accountAddress));
  console.log("  Owner Program:", pubkeyToBase58(account.programAddress));
  console.log("  Account Type:", account.accountIdl.name);
  console.log("  Lamports:", account.accountLamports);
  console.log("  Executable:", account.accountExecutable);
  console.log("  Data Size:", account.accountData.length, "bytes");
  console.log("  Decoded State:", JSON.stringify(account.accountState, null, 2));
  
  return account;
}

// Example 2: Fetch multiple accounts
async function fetchMultipleAccounts(addresses: Pubkey[]) {
  const solana = new Solana("devnet");
  
  const accounts = [];
  
  for (const address of addresses) {
    try {
      const account = await solana.getAndInferAndDecodeAccount(address);
      accounts.push({
        address: pubkeyToBase58(address),
        type: account.accountIdl.name,
        state: account.accountState,
        lamports: account.accountLamports,
      });
    } catch (error) {
      console.error(`Failed to fetch account ${pubkeyToBase58(address)}:`, error);
    }
  }
  
  return accounts;
}

// Example 3: Check account balance
async function checkAccountBalance(accountAddress: Pubkey) {
  const solana = new Solana("devnet");
  
  const account = await solana.getAndInferAndDecodeAccount(accountAddress);
  
  // Convert lamports to SOL (1 SOL = 1,000,000,000 lamports)
  const balanceInSol = Number(account.accountLamports) / 1_000_000_000;
  
  console.log(`Account ${pubkeyToBase58(accountAddress)}:`);
  console.log(`  Balance: ${account.accountLamports} lamports`);
  console.log(`  Balance: ${balanceInSol.toFixed(9)} SOL`);
  
  return account.accountLamports;
}

// Example 4: Get account with specific program
async function getAccountOfProgram(
  accountAddress: Pubkey,
  expectedProgramAddress: Pubkey
) {
  const solana = new Solana("devnet");
  
  const account = await solana.getAndInferAndDecodeAccount(accountAddress);
  
  // Verify the account is owned by the expected program
  if (pubkeyToBase58(account.programAddress) !== pubkeyToBase58(expectedProgramAddress)) {
    throw new Error(
      `Account is not owned by expected program. ` +
      `Expected: ${pubkeyToBase58(expectedProgramAddress)}, ` +
      `Got: ${pubkeyToBase58(account.programAddress)}`
    );
  }
  
  console.log("Account verified and decoded successfully");
  return account;
}

// Example 5: Inspect account data structure
async function inspectAccountStructure(accountAddress: Pubkey) {
  const solana = new Solana("devnet");
  
  const account = await solana.getAndInferAndDecodeAccount(accountAddress);
  
  console.log("Account Structure:");
  console.log("  IDL Name:", account.accountIdl.name);
  console.log("  IDL Description:", account.accountIdl.docs);
  console.log("  Type Full:", JSON.stringify(account.accountIdl.typeFull, null, 2));
  
  // Show the state in a readable format
  console.log("\nDecoded State:");
  if (account.accountState) {
    for (const [key, value] of Object.entries(account.accountState)) {
      console.log(`  ${key}:`, value);
    }
  } else {
    console.log("  (No decoded state - raw account)");
  }
  
  return account;
}

// Main example runner
async function main() {
  console.log("=== Account Operations Examples ===\n");
  
  // Replace with actual account addresses for testing
  const exampleAccountAddress = pubkeyFromBase58(
    "UCNcQRtrbGmvuLKA3Jv719Cc6DS4r661ZRpyZduxu2j" // Example program address
  );
  
  try {
    console.log("1. Fetching and decoding account...");
    await fetchAndDecodeAccount(exampleAccountAddress);
    console.log("   ✓ Account fetched and decoded\n");
  } catch (error) {
    console.error("   ✗ Error:", error);
  }
  
  console.log("\nNote: To run these examples with real data:");
  console.log("1. Replace 'exampleAccountAddress' with actual account addresses");
  console.log("2. Ensure the accounts exist on devnet");
  console.log("3. Uncomment the main() call at the bottom of this file");
}

// Uncomment to run examples:
// main().catch(console.error);
