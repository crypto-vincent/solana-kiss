/**
 * Transaction Operations Examples
 * 
 * This snippet demonstrates how to build, sign, send, and simulate transactions
 * using solana-kiss.
 */

import {
  Solana,
  Signer,
  signerFromSecret,
  signerGenerate,
  pubkeyDefault,
  pubkeyToBase58,
  InstructionRequest,
  rpcHttpWaitForTransaction,
  timeoutMs,
} from "solana-kiss";

// Example 1: Build and encode an instruction
async function buildInstruction(
  solana: Solana,
  payerAddress: string,
  recipientAddress: string
) {
  // Build a system program instruction
  const { instructionRequest } = await solana.hydrateAndEncodeInstruction(
    pubkeyDefault, // System program
    "transfer", // Instruction name
    {
      instructionAddresses: {
        from: payerAddress,
        to: recipientAddress,
      },
      instructionPayload: {
        lamports: "1000000", // 0.001 SOL
      },
    }
  );
  
  console.log("Instruction built:");
  console.log("  Program:", pubkeyToBase58(instructionRequest.programAddress));
  console.log("  Data length:", instructionRequest.instructionData.length);
  console.log("  Accounts:", instructionRequest.instructionInputs.length);
  
  return instructionRequest;
}

// Example 2: Send a simple transaction
async function sendSimpleTransaction(payerSigner: Signer) {
  const solana = new Solana("devnet");
  
  // Generate a recipient
  const recipientSigner = await signerGenerate();
  
  // Build instruction
  const { instructionRequest } = await solana.hydrateAndEncodeInstruction(
    pubkeyDefault,
    "transfer",
    {
      instructionAddresses: {
        from: pubkeyToBase58(payerSigner.address),
        to: pubkeyToBase58(recipientSigner.address),
      },
      instructionPayload: {
        lamports: "1000000",
      },
    }
  );
  
  // Send transaction
  const { transactionHandle } = await solana.prepareAndSendTransaction(
    payerSigner,
    [instructionRequest],
    {
      skipPreflight: false, // Enable preflight checks
    }
  );
  
  console.log("Transaction sent!");
  console.log("  Signature:", transactionHandle);
  
  return transactionHandle;
}

// Example 3: Send transaction with multiple instructions
async function sendBatchTransaction(payerSigner: Signer) {
  const solana = new Solana("devnet");
  
  // Generate multiple recipients
  const recipient1 = await signerGenerate();
  const recipient2 = await signerGenerate();
  
  // Build multiple instructions
  const instruction1 = await solana.hydrateAndEncodeInstruction(
    pubkeyDefault,
    "transfer",
    {
      instructionAddresses: {
        from: pubkeyToBase58(payerSigner.address),
        to: pubkeyToBase58(recipient1.address),
      },
      instructionPayload: {
        lamports: "1000000",
      },
    }
  );
  
  const instruction2 = await solana.hydrateAndEncodeInstruction(
    pubkeyDefault,
    "transfer",
    {
      instructionAddresses: {
        from: pubkeyToBase58(payerSigner.address),
        to: pubkeyToBase58(recipient2.address),
      },
      instructionPayload: {
        lamports: "2000000",
      },
    }
  );
  
  // Send transaction with multiple instructions
  const { transactionHandle } = await solana.prepareAndSendTransaction(
    payerSigner,
    [instruction1.instructionRequest, instruction2.instructionRequest]
  );
  
  console.log("Batch transaction sent!");
  console.log("  Signature:", transactionHandle);
  
  return transactionHandle;
}

// Example 4: Send transaction with extra signers
async function sendTransactionWithExtraSigners(payerSigner: Signer) {
  const solana = new Solana("devnet");
  
  // Generate a new account that needs to sign
  const newAccountSigner = await signerGenerate();
  
  // Create account instruction (requires the new account to sign)
  const { instructionRequest } = await solana.hydrateAndEncodeInstruction(
    pubkeyDefault,
    "create",
    {
      instructionAddresses: {
        payer: pubkeyToBase58(payerSigner.address),
        created: pubkeyToBase58(newAccountSigner.address),
      },
      instructionPayload: {
        lamports: "1000000",
        space: 42,
        owner: pubkeyToBase58(pubkeyDefault),
      },
    }
  );
  
  // Send with extra signers
  const { transactionHandle } = await solana.prepareAndSendTransaction(
    payerSigner,
    [instructionRequest],
    {
      extraSigners: [newAccountSigner], // Additional required signers
    }
  );
  
  console.log("Transaction with extra signers sent!");
  console.log("  Signature:", transactionHandle);
  
  return transactionHandle;
}

// Example 5: Simulate a transaction
async function simulateTransaction(payerSigner: Signer) {
  const solana = new Solana("devnet");
  
  const recipientSigner = await signerGenerate();
  
  // Build instruction
  const { instructionRequest } = await solana.hydrateAndEncodeInstruction(
    pubkeyDefault,
    "transfer",
    {
      instructionAddresses: {
        from: pubkeyToBase58(payerSigner.address),
        to: pubkeyToBase58(recipientSigner.address),
      },
      instructionPayload: {
        lamports: "1000000",
      },
    }
  );
  
  // Simulate without sending
  const simulation = await solana.prepareAndSimulateTransaction(
    payerSigner,
    [instructionRequest],
    {
      verifySignaturesAndBlockHash: true,
    }
  );
  
  console.log("Transaction simulated:");
  console.log("  Error:", simulation.transactionError || "None");
  console.log("  Logs:");
  simulation.transactionLogs?.forEach((log) => {
    console.log("    ", log);
  });
  
  return simulation;
}

// Example 6: Wait for transaction confirmation
async function sendAndWaitForConfirmation(payerSigner: Signer) {
  const solana = new Solana("devnet");
  const rpcHttp = solana.getRpcHttp();
  
  const recipientSigner = await signerGenerate();
  
  // Build and send transaction
  const { instructionRequest } = await solana.hydrateAndEncodeInstruction(
    pubkeyDefault,
    "transfer",
    {
      instructionAddresses: {
        from: pubkeyToBase58(payerSigner.address),
        to: pubkeyToBase58(recipientSigner.address),
      },
      instructionPayload: {
        lamports: "1000000",
      },
    }
  );
  
  const { transactionHandle } = await solana.prepareAndSendTransaction(
    payerSigner,
    [instructionRequest]
  );
  
  console.log("Transaction sent, waiting for confirmation...");
  
  // Wait for confirmation
  const { transactionExecution } = await rpcHttpWaitForTransaction(
    rpcHttp,
    transactionHandle,
    async (context) => {
      if (context.totalDurationMs > 30000) {
        throw new Error("Transaction confirmation timed out");
      }
      await timeoutMs(1000); // Poll every second
      return true;
    }
  );
  
  console.log("Transaction confirmed!");
  console.log("  Fees charged:", transactionExecution.chargedFeesLamports);
  console.log("  Error:", transactionExecution.transactionError || "None");
  
  return transactionExecution;
}

// Example 7: Decode an instruction from transaction data
async function decodeInstruction(instructionRequest: InstructionRequest) {
  const solana = new Solana("devnet");
  
  // Infer and decode the instruction
  const decoded = await solana.inferAndDecodeInstruction(instructionRequest);
  
  console.log("Instruction decoded:");
  console.log("  Program:", decoded.programIdl.metadata.name);
  console.log("  Instruction:", decoded.instructionIdl.name);
  console.log("  Addresses:", JSON.stringify(decoded.instructionAddresses, null, 2));
  console.log("  Payload:", JSON.stringify(decoded.instructionPayload, null, 2));
  
  return decoded;
}

// Main example runner
async function main() {
  console.log("=== Transaction Operations Examples ===\n");
  
  console.log("To run these examples, you need:");
  console.log("1. A funded wallet on devnet");
  console.log("2. The wallet's secret key");
  console.log("\nYou can get devnet SOL from: https://faucet.solana.com/");
  console.log("\nExample usage:");
  console.log("  const secret = new Uint8Array([...])");
  console.log("  const payerSigner = await signerFromSecret(secret);");
  console.log("  await sendSimpleTransaction(payerSigner);");
}

// Uncomment to run examples:
// main().catch(console.error);
