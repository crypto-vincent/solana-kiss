/**
 * Program Query Operations Examples
 * 
 * This snippet demonstrates how to query program-owned accounts and
 * perform batch operations using solana-kiss.
 */

import {
  Solana,
  Pubkey,
  pubkeyFromBase58,
  pubkeyToBase58,
} from "solana-kiss";

// Example 1: Find all program-owned accounts of a specific type
async function findProgramAccounts(
  programAddress: Pubkey,
  accountName: string
) {
  const solana = new Solana("devnet");
  
  // Find all accounts owned by the program that match the account type
  const { accountsAddresses } = await solana.findProgramOwnedAccounts(
    programAddress,
    accountName
  );
  
  console.log(`Found ${accountsAddresses.size} "${accountName}" accounts`);
  console.log("Addresses:");
  
  let count = 0;
  for (const address of accountsAddresses) {
    console.log(`  ${++count}. ${pubkeyToBase58(address)}`);
    if (count >= 10) {
      console.log(`  ... and ${accountsAddresses.size - 10} more`);
      break;
    }
  }
  
  return accountsAddresses;
}

// Example 2: Fetch and decode all program-owned accounts
async function fetchAndDecodeAllAccounts(
  programAddress: Pubkey,
  accountName: string
) {
  const solana = new Solana("devnet");
  
  // Find all accounts
  const { accountsAddresses } = await solana.findProgramOwnedAccounts(
    programAddress,
    accountName
  );
  
  console.log(`Fetching ${accountsAddresses.size} accounts...`);
  
  const accounts = [];
  
  for (const accountAddress of accountsAddresses) {
    try {
      const account = await solana.getAndInferAndDecodeAccount(accountAddress);
      accounts.push({
        address: pubkeyToBase58(accountAddress),
        type: account.accountIdl.name,
        state: account.accountState,
        lamports: account.accountLamports,
      });
    } catch (error) {
      console.error(`Failed to fetch ${pubkeyToBase58(accountAddress)}:`, error);
    }
  }
  
  console.log(`Successfully fetched ${accounts.length} accounts`);
  
  return accounts;
}

// Example 3: Find accounts with specific filters
async function findAndFilterAccounts(
  programAddress: Pubkey,
  accountName: string,
  filter: (account: any) => boolean
) {
  const solana = new Solana("devnet");
  
  const { accountsAddresses } = await solana.findProgramOwnedAccounts(
    programAddress,
    accountName
  );
  
  console.log(`Filtering ${accountsAddresses.size} accounts...`);
  
  const filtered = [];
  
  for (const accountAddress of accountsAddresses) {
    try {
      const account = await solana.getAndInferAndDecodeAccount(accountAddress);
      
      if (filter(account.accountState)) {
        filtered.push({
          address: pubkeyToBase58(accountAddress),
          state: account.accountState,
        });
      }
    } catch (error) {
      // Skip accounts that can't be fetched
    }
  }
  
  console.log(`Found ${filtered.length} matching accounts`);
  
  return filtered;
}

// Example 4: Get account statistics
async function getAccountStatistics(
  programAddress: Pubkey,
  accountName: string
) {
  const solana = new Solana("devnet");
  
  const { accountsAddresses } = await solana.findProgramOwnedAccounts(
    programAddress,
    accountName
  );
  
  console.log(`Analyzing ${accountsAddresses.size} accounts...`);
  
  let totalLamports = 0n;
  let minLamports = BigInt(Number.MAX_SAFE_INTEGER);
  let maxLamports = 0n;
  let totalSize = 0;
  let fetchedCount = 0;
  
  for (const accountAddress of accountsAddresses) {
    try {
      const account = await solana.getAndInferAndDecodeAccount(accountAddress);
      
      totalLamports += account.accountLamports;
      minLamports = account.accountLamports < minLamports ? account.accountLamports : minLamports;
      maxLamports = account.accountLamports > maxLamports ? account.accountLamports : maxLamports;
      totalSize += account.accountData.length;
      fetchedCount++;
    } catch (error) {
      // Skip accounts that can't be fetched
    }
  }
  
  const avgLamports = fetchedCount > 0 ? totalLamports / BigInt(fetchedCount) : 0n;
  const avgSize = fetchedCount > 0 ? totalSize / fetchedCount : 0;
  
  console.log("\nAccount Statistics:");
  console.log(`  Total accounts: ${accountsAddresses.size}`);
  console.log(`  Fetched accounts: ${fetchedCount}`);
  console.log(`  Total lamports: ${totalLamports}`);
  console.log(`  Average lamports: ${avgLamports}`);
  console.log(`  Min lamports: ${minLamports}`);
  console.log(`  Max lamports: ${maxLamports}`);
  console.log(`  Average size: ${avgSize} bytes`);
  console.log(`  Total size: ${totalSize} bytes`);
  
  return {
    total: accountsAddresses.size,
    fetched: fetchedCount,
    totalLamports,
    avgLamports,
    minLamports,
    maxLamports,
    avgSize,
    totalSize,
  };
}

// Example 5: Sample a subset of accounts
async function sampleAccounts(
  programAddress: Pubkey,
  accountName: string,
  sampleSize: number
) {
  const solana = new Solana("devnet");
  
  const { accountsAddresses } = await solana.findProgramOwnedAccounts(
    programAddress,
    accountName
  );
  
  console.log(`Sampling ${sampleSize} out of ${accountsAddresses.size} accounts...`);
  
  const addressArray = [...accountsAddresses];
  const samples = [];
  
  // Take first N accounts (or random sample if you prefer)
  for (let i = 0; i < Math.min(sampleSize, addressArray.length); i++) {
    const accountAddress = addressArray[i];
    
    try {
      const account = await solana.getAndInferAndDecodeAccount(accountAddress);
      samples.push({
        address: pubkeyToBase58(accountAddress),
        state: account.accountState,
      });
    } catch (error) {
      console.error(`Failed to fetch sample account:`, error);
    }
  }
  
  console.log(`Sampled ${samples.length} accounts`);
  
  return samples;
}

// Example 6: Find accounts by owner
async function findAccountsByOwner(
  programAddress: Pubkey,
  accountName: string,
  ownerPubkey: Pubkey
) {
  const solana = new Solana("devnet");
  
  // First, find all accounts
  const { accountsAddresses } = await solana.findProgramOwnedAccounts(
    programAddress,
    accountName
  );
  
  console.log(`Searching for accounts owned by ${pubkeyToBase58(ownerPubkey)}...`);
  
  const ownedAccounts = [];
  
  for (const accountAddress of accountsAddresses) {
    try {
      const account = await solana.getAndInferAndDecodeAccount(accountAddress);
      
      // Check if the account has an "owner" or "authority" field matching our search
      if (
        account.accountState &&
        (account.accountState.owner === pubkeyToBase58(ownerPubkey) ||
         account.accountState.authority === pubkeyToBase58(ownerPubkey))
      ) {
        ownedAccounts.push({
          address: pubkeyToBase58(accountAddress),
          state: account.accountState,
        });
      }
    } catch (error) {
      // Skip accounts that can't be fetched or decoded
    }
  }
  
  console.log(`Found ${ownedAccounts.length} accounts owned by the specified address`);
  
  return ownedAccounts;
}

// Example 7: Batch process accounts
async function batchProcessAccounts(
  programAddress: Pubkey,
  accountName: string,
  processor: (account: any) => Promise<void>,
  batchSize: number = 10
) {
  const solana = new Solana("devnet");
  
  const { accountsAddresses } = await solana.findProgramOwnedAccounts(
    programAddress,
    accountName
  );
  
  console.log(`Processing ${accountsAddresses.size} accounts in batches of ${batchSize}...`);
  
  const addressArray = [...accountsAddresses];
  let processed = 0;
  
  for (let i = 0; i < addressArray.length; i += batchSize) {
    const batch = addressArray.slice(i, i + batchSize);
    
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}...`);
    
    // Process batch in parallel
    await Promise.all(
      batch.map(async (accountAddress) => {
        try {
          const account = await solana.getAndInferAndDecodeAccount(accountAddress);
          await processor(account);
          processed++;
        } catch (error) {
          console.error(`Failed to process ${pubkeyToBase58(accountAddress)}:`, error);
        }
      })
    );
  }
  
  console.log(`Processed ${processed} accounts successfully`);
  
  return processed;
}

// Example 8: Compare account states
async function compareAccountStates(
  programAddress: Pubkey,
  accountName: string,
  account1Address: Pubkey,
  account2Address: Pubkey
) {
  const solana = new Solana("devnet");
  
  console.log("Fetching accounts for comparison...");
  
  const account1 = await solana.getAndInferAndDecodeAccount(account1Address);
  const account2 = await solana.getAndInferAndDecodeAccount(account2Address);
  
  console.log("\nAccount 1:");
  console.log("  Address:", pubkeyToBase58(account1Address));
  console.log("  Type:", account1.accountIdl.name);
  console.log("  State:", JSON.stringify(account1.accountState, null, 2));
  
  console.log("\nAccount 2:");
  console.log("  Address:", pubkeyToBase58(account2Address));
  console.log("  Type:", account2.accountIdl.name);
  console.log("  State:", JSON.stringify(account2.accountState, null, 2));
  
  console.log("\nDifferences:");
  // Basic comparison - can be enhanced based on needs
  const keys1 = Object.keys(account1.accountState || {});
  const keys2 = Object.keys(account2.accountState || {});
  
  const allKeys = new Set([...keys1, ...keys2]);
  
  for (const key of allKeys) {
    const val1 = account1.accountState?.[key];
    const val2 = account2.accountState?.[key];
    
    if (JSON.stringify(val1) !== JSON.stringify(val2)) {
      console.log(`  ${key}:`);
      console.log(`    Account 1: ${JSON.stringify(val1)}`);
      console.log(`    Account 2: ${JSON.stringify(val2)}`);
    }
  }
  
  return { account1, account2 };
}

// Main example runner
async function main() {
  console.log("=== Program Query Operations Examples ===\n");
  
  // Example: Campaign program on devnet
  const exampleProgramAddress = pubkeyFromBase58(
    "UCNcQRtrbGmvuLKA3Jv719Cc6DS4r661ZRpyZduxu2j"
  );
  
  try {
    console.log("Finding program-owned accounts...");
    await findProgramAccounts(exampleProgramAddress, "Campaign");
    console.log("✓ Accounts found\n");
  } catch (error) {
    console.error("Error:", error);
  }
  
  console.log("\nNote: These examples work with programs that have");
  console.log("multiple accounts on-chain. Adjust the program address");
  console.log("and account name for your specific use case.");
}

// Uncomment to run examples:
// main().catch(console.error);
