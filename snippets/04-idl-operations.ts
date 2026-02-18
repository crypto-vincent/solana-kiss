/**
 * IDL (Interface Definition Language) Operations Examples
 * 
 * This snippet demonstrates how to load, query, and work with program IDLs
 * using solana-kiss.
 */

import {
  Solana,
  Pubkey,
  pubkeyFromBase58,
  pubkeyToBase58,
  IdlProgram,
} from "solana-kiss";

// Example 1: Load a program's IDL
async function loadProgramIdl(programAddress: Pubkey) {
  const solana = new Solana("devnet");
  
  // Automatically load the IDL from various sources:
  // 1. On-chain metadata
  // 2. On-chain Anchor IDL account
  // 3. GitHub repository of known IDLs
  // 4. Custom loaders
  const { programIdl } = await solana.getOrLoadProgramIdl(programAddress);
  
  console.log("Program IDL loaded:");
  console.log("  Name:", programIdl.metadata.name);
  console.log("  Address:", pubkeyToBase58(programIdl.metadata.address));
  console.log("  Instructions:", programIdl.instructions.size);
  console.log("  Accounts:", programIdl.accounts.size);
  console.log("  Type definitions:", programIdl.typedefs.size);
  console.log("  Errors:", programIdl.errors.size);
  console.log("  Events:", programIdl.events.size);
  
  return programIdl;
}

// Example 2: List program instructions
async function listProgramInstructions(programAddress: Pubkey) {
  const solana = new Solana("devnet");
  
  const { programIdl } = await solana.getOrLoadProgramIdl(programAddress);
  
  console.log(`Instructions for ${programIdl.metadata.name}:`);
  for (const [name, instruction] of programIdl.instructions) {
    console.log(`\n  ${name}:`);
    console.log(`    Description: ${instruction.docs || "N/A"}`);
    console.log(`    Accounts: ${instruction.accounts.length}`);
    console.log(`    Args: ${instruction.args.length}`);
  }
  
  return [...programIdl.instructions.keys()];
}

// Example 3: List program accounts
async function listProgramAccounts(programAddress: Pubkey) {
  const solana = new Solana("devnet");
  
  const { programIdl } = await solana.getOrLoadProgramIdl(programAddress);
  
  console.log(`Account types for ${programIdl.metadata.name}:`);
  for (const [name, account] of programIdl.accounts) {
    console.log(`\n  ${name}:`);
    console.log(`    Description: ${account.docs || "N/A"}`);
    console.log(`    Size: ${account.dataSpace} bytes`);
    console.log(`    Type: ${account.typeFull.kind}`);
  }
  
  return [...programIdl.accounts.keys()];
}

// Example 4: Get instruction details
async function getInstructionDetails(
  programAddress: Pubkey,
  instructionName: string
) {
  const solana = new Solana("devnet");
  
  const { instructionIdl } = await solana.getOrLoadInstructionIdl(
    programAddress,
    instructionName
  );
  
  console.log(`Instruction: ${instructionIdl.name}`);
  console.log(`Description: ${instructionIdl.docs || "N/A"}`);
  
  console.log("\nAccounts:");
  for (const account of instructionIdl.accounts) {
    console.log(`  ${account.name}:`);
    console.log(`    Mutable: ${account.isMutable}`);
    console.log(`    Signer: ${account.isSigner}`);
  }
  
  console.log("\nArguments:");
  for (const arg of instructionIdl.args) {
    console.log(`  ${arg.name}: ${JSON.stringify(arg.type)}`);
  }
  
  return instructionIdl;
}

// Example 5: List program PDAs (Program Derived Addresses)
async function listProgramPdas(programAddress: Pubkey) {
  const solana = new Solana("devnet");
  
  const { programIdl } = await solana.getOrLoadProgramIdl(programAddress);
  
  console.log(`PDAs for ${programIdl.metadata.name}:`);
  for (const [name, pda] of programIdl.pdas) {
    console.log(`\n  ${name}:`);
    console.log(`    Seeds:`);
    for (const seed of pda.seeds) {
      console.log(`      - ${seed.name}: ${JSON.stringify(seed.type)}`);
    }
  }
  
  return [...programIdl.pdas.keys()];
}

// Example 6: List program errors
async function listProgramErrors(programAddress: Pubkey) {
  const solana = new Solana("devnet");
  
  const { programIdl } = await solana.getOrLoadProgramIdl(programAddress);
  
  console.log(`Errors for ${programIdl.metadata.name}:`);
  for (const [code, error] of programIdl.errors) {
    console.log(`  ${code}: ${error.name}`);
    if (error.message) {
      console.log(`    ${error.message}`);
    }
  }
  
  return [...programIdl.errors.entries()];
}

// Example 7: Preload custom IDL
async function preloadCustomIdl(
  programAddress: Pubkey,
  customIdl: IdlProgram
) {
  // Create Solana instance with preloaded IDL
  const customIdlPreload = new Map<Pubkey, IdlProgram>();
  customIdlPreload.set(programAddress, customIdl);
  
  const solana = new Solana("devnet", {
    customIdlPreload,
  });
  
  // The IDL is now immediately available without fetching
  const { programIdl } = await solana.getOrLoadProgramIdl(programAddress);
  
  console.log("Custom IDL preloaded:");
  console.log("  Name:", programIdl.metadata.name);
  
  return solana;
}

// Example 8: Set/update program IDL
async function updateProgramIdl(
  programAddress: Pubkey,
  newIdl: IdlProgram
) {
  const solana = new Solana("devnet");
  
  // Set or update the IDL for a program
  solana.setProgramIdl(programAddress, newIdl);
  
  console.log("Program IDL updated");
  
  // To remove an IDL:
  // solana.setProgramIdl(programAddress, undefined);
  
  return solana;
}

// Example 9: Custom IDL loader
async function useCustomIdlLoader() {
  const { idlLoaderFromUrl } = await import("solana-kiss");
  
  // Create a custom IDL loader that fetches from your server
  const customIdlLoader = idlLoaderFromUrl((programAddress) => {
    return `https://your-idl-server.com/idls/${pubkeyToBase58(programAddress)}.json`;
  });
  
  const solana = new Solana("devnet", {
    customIdlLoaders: [customIdlLoader],
  });
  
  console.log("Solana instance created with custom IDL loader");
  
  return solana;
}

// Example 10: Explore program structure
async function exploreProgramStructure(programAddress: Pubkey) {
  const solana = new Solana("devnet");
  
  const { programIdl } = await solana.getOrLoadProgramIdl(programAddress);
  
  console.log("=== Program Structure ===");
  console.log("\nMetadata:");
  console.log("  Name:", programIdl.metadata.name);
  console.log("  Version:", programIdl.metadata.version || "N/A");
  console.log("  Address:", pubkeyToBase58(programIdl.metadata.address));
  
  console.log("\nCapabilities:");
  console.log("  Instructions:", [...programIdl.instructions.keys()].join(", "));
  console.log("  Account Types:", [...programIdl.accounts.keys()].join(", "));
  console.log("  PDAs:", [...programIdl.pdas.keys()].join(", "));
  console.log("  Custom Types:", [...programIdl.typedefs.keys()].join(", "));
  
  if (programIdl.constants.size > 0) {
    console.log("\nConstants:");
    for (const [name, constant] of programIdl.constants) {
      console.log(`  ${name}:`, constant.value);
    }
  }
  
  return programIdl;
}

// Main example runner
async function main() {
  console.log("=== IDL Operations Examples ===\n");
  
  // Example program address (Whirlpool on devnet)
  const exampleProgramAddress = pubkeyFromBase58(
    "ProgM6JCCvbYkfKqJYHePx4xxSUSqJp7rh8Lyv7nk7S"
  );
  
  try {
    console.log("Loading program IDL...");
    await loadProgramIdl(exampleProgramAddress);
    console.log("✓ IDL loaded\n");
  } catch (error) {
    console.error("Error:", error);
  }
  
  console.log("\nNote: To run these examples with other programs:");
  console.log("1. Replace 'exampleProgramAddress' with your program address");
  console.log("2. Ensure the program has an IDL available");
  console.log("3. Uncomment the main() call at the bottom of this file");
}

// Uncomment to run examples:
// main().catch(console.error);
