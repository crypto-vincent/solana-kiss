/**
 * PDA (Program Derived Address) Operations Examples
 * 
 * This snippet demonstrates how to find and work with PDAs using solana-kiss.
 */

import {
  Solana,
  Pubkey,
  pubkeyFromBase58,
  pubkeyToBase58,
  pubkeyFindPdaAddress,
  utf8Encode,
} from "solana-kiss";

// Example 1: Find PDA using program IDL
async function findPdaFromIdl(
  programAddress: Pubkey,
  pdaName: string,
  pdaInputs: Record<string, any>
) {
  const solana = new Solana("devnet");
  
  // The IDL defines the PDA seeds structure
  // This method automatically uses the IDL to derive the PDA
  const { pdaAddress, pdaBump } = await solana.findPdaAddress(
    programAddress,
    pdaName,
    pdaInputs
  );
  
  console.log(`PDA "${pdaName}" found:`);
  console.log("  Address:", pubkeyToBase58(pdaAddress));
  console.log("  Bump:", pdaBump);
  console.log("  Inputs:", JSON.stringify(pdaInputs, null, 2));
  
  return { pdaAddress, pdaBump };
}

// Example 2: Find PDA manually (without IDL)
function findPdaManually(programAddress: Pubkey) {
  // Manually construct seeds
  const seeds = [
    utf8Encode("metadata"), // String seed
    pubkeyToBytes(programAddress).slice(0, 32), // First 32 bytes of pubkey
  ];
  
  // Find PDA
  const pdaAddress = pubkeyFindPdaAddress(programAddress, seeds);
  
  console.log("PDA found manually:");
  console.log("  Address:", pubkeyToBase58(pdaAddress));
  
  return pdaAddress;
}

// Example 3: Find user-specific PDA
async function findUserPda(
  programAddress: Pubkey,
  userAddress: Pubkey
) {
  const solana = new Solana("devnet");
  
  // Many programs use user PDAs with the user's pubkey as a seed
  const { pdaAddress } = await solana.findPdaAddress(
    programAddress,
    "user_account", // PDA name from IDL
    {
      user: pubkeyToBase58(userAddress), // User's address
    }
  );
  
  console.log("User PDA:");
  console.log("  User:", pubkeyToBase58(userAddress));
  console.log("  PDA:", pubkeyToBase58(pdaAddress));
  
  return pdaAddress;
}

// Example 4: Find PDA with multiple seeds
async function findComplexPda(programAddress: Pubkey) {
  const solana = new Solana("devnet");
  
  const userAddress = pubkeyFromBase58("11111111111111111111111111111111");
  const poolId = 42;
  
  // PDAs can have multiple seeds of different types
  const { pdaAddress, pdaBump } = await solana.findPdaAddress(
    programAddress,
    "pool_position",
    {
      user: pubkeyToBase58(userAddress),
      pool_id: poolId,
    }
  );
  
  console.log("Complex PDA:");
  console.log("  Address:", pubkeyToBase58(pdaAddress));
  console.log("  Seeds: user + pool_id");
  
  return pdaAddress;
}

// Example 5: Check if PDA exists and decode it
async function checkAndDecodePda(
  programAddress: Pubkey,
  pdaName: string,
  pdaInputs: Record<string, any>
) {
  const solana = new Solana("devnet");
  
  // Find the PDA
  const { pdaAddress } = await solana.findPdaAddress(
    programAddress,
    pdaName,
    pdaInputs
  );
  
  try {
    // Try to fetch and decode the account
    const account = await solana.getAndInferAndDecodeAccount(pdaAddress);
    
    console.log("PDA exists and decoded:");
    console.log("  Address:", pubkeyToBase58(pdaAddress));
    console.log("  Type:", account.accountIdl.name);
    console.log("  State:", JSON.stringify(account.accountState, null, 2));
    
    return { exists: true, account };
  } catch (error) {
    console.log("PDA does not exist yet:");
    console.log("  Address:", pubkeyToBase58(pdaAddress));
    
    return { exists: false, account: null };
  }
}

// Example 6: Find multiple PDAs for a user
async function findUserPdas(
  programAddress: Pubkey,
  userAddress: Pubkey
) {
  const solana = new Solana("devnet");
  
  // Get the program IDL to see available PDAs
  const { programIdl } = await solana.getOrLoadProgramIdl(programAddress);
  
  console.log(`Finding PDAs for user ${pubkeyToBase58(userAddress)}:`);
  
  const pdas: Record<string, Pubkey> = {};
  
  // Find each user-related PDA
  for (const [pdaName, pdaIdl] of programIdl.pdas) {
    // Check if this PDA uses a "user" seed
    const hasUserSeed = pdaIdl.seeds.some((seed) => seed.name === "user");
    
    if (hasUserSeed) {
      try {
        const { pdaAddress } = await solana.findPdaAddress(
          programAddress,
          pdaName,
          { user: pubkeyToBase58(userAddress) }
        );
        
        pdas[pdaName] = pdaAddress;
        console.log(`  ${pdaName}: ${pubkeyToBase58(pdaAddress)}`);
      } catch (error) {
        console.log(`  ${pdaName}: Could not derive (missing seeds)`);
      }
    }
  }
  
  return pdas;
}

// Example 7: Create instruction to initialize a PDA
async function createPdaInitInstruction(
  programAddress: Pubkey,
  userSigner: Pubkey,
  pdaName: string
) {
  const solana = new Solana("devnet");
  
  // Find the PDA that will be initialized
  const { pdaAddress } = await solana.findPdaAddress(
    programAddress,
    pdaName,
    { user: pubkeyToBase58(userSigner) }
  );
  
  console.log("Creating PDA initialization instruction:");
  console.log("  PDA:", pubkeyToBase58(pdaAddress));
  
  // Build the initialization instruction
  const { instructionRequest } = await solana.hydrateAndEncodeInstruction(
    programAddress,
    "initialize_user", // Example instruction name
    {
      instructionAddresses: {
        user: pubkeyToBase58(userSigner),
        user_account: pubkeyToBase58(pdaAddress),
        system_program: pubkeyToBase58(pubkeyFromBase58("11111111111111111111111111111111")),
      },
      instructionPayload: {
        // Instruction-specific data
      },
    }
  );
  
  return { instructionRequest, pdaAddress };
}

// Example 8: List all PDAs defined in a program
async function listProgramPdas(programAddress: Pubkey) {
  const solana = new Solana("devnet");
  
  const { programIdl } = await solana.getOrLoadProgramIdl(programAddress);
  
  console.log(`PDAs defined in ${programIdl.metadata.name}:`);
  
  for (const [pdaName, pdaIdl] of programIdl.pdas) {
    console.log(`\n  ${pdaName}:`);
    console.log("    Seeds:");
    for (const seed of pdaIdl.seeds) {
      console.log(`      - ${seed.name}: ${JSON.stringify(seed.type)}`);
    }
  }
  
  return [...programIdl.pdas.keys()];
}

// Example 9: Hydrate instruction addresses including PDAs
async function hydrateInstructionWithPdas(programAddress: Pubkey) {
  const solana = new Solana("devnet");
  
  const userAddress = pubkeyFromBase58("11111111111111111111111111111111");
  
  // Hydrate instruction addresses - PDAs will be auto-derived
  const { instructionAddresses } = await solana.hydrateInstructionAddresses(
    programAddress,
    "some_instruction",
    {
      instructionAddresses: {
        user: pubkeyToBase58(userAddress),
        // user_account PDA will be auto-derived if not provided
      },
      instructionPayload: {
        amount: 100,
      },
    }
  );
  
  console.log("Hydrated instruction addresses:");
  console.log(JSON.stringify(instructionAddresses, null, 2));
  
  return instructionAddresses;
}

// Main example runner
async function main() {
  console.log("=== PDA Operations Examples ===\n");
  
  console.log("PDA (Program Derived Address) are special addresses");
  console.log("derived from a program ID and seeds.");
  console.log("\nThey are commonly used for:");
  console.log("  - User-specific program accounts");
  console.log("  - Pool or vault addresses");
  console.log("  - Metadata accounts");
  console.log("  - Authority accounts");
  
  console.log("\nTo run these examples:");
  console.log("1. Use a program address that has PDAs defined in its IDL");
  console.log("2. Provide the correct PDA name and input seeds");
  console.log("3. Uncomment the main() call at the bottom of this file");
}

// Uncomment to run examples:
// main().catch(console.error);
