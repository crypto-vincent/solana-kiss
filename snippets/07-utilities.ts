/**
 * Utility Functions Examples
 * 
 * This snippet demonstrates the various utility functions available in solana-kiss
 * for working with Solana data types.
 */

import {
  // Pubkey utilities
  pubkeyFromBase58,
  pubkeyToBase58,
  pubkeyFromBytes,
  pubkeyToBytes,
  pubkeyDefault,
  pubkeyNewDummy,
  pubkeyFindPdaAddress,
  
  // Signer utilities
  signerGenerate,
  signerFromSecret,
  
  // Base encoding utilities
  base58Encode,
  base58Decode,
  base64Encode,
  base64Decode,
  base16Encode,
  base16Decode,
  
  // Lamports utilities
  approximateLamportsForSols,
  approximateSolsForLamports,
  lamportsFeePerSignature,
  lamportsRentExemptionMinimumForSpace,
  
  // UTF-8 utilities
  utf8Encode,
  utf8Decode,
  
  // Signature utilities
  signatureToBytes,
  signatureFromBytes,
  
  // JSON utilities
  jsonIsDeepSubset,
  jsonGetAt,
} from "solana-kiss";

// ============================================================================
// Pubkey Examples
// ============================================================================

function pubkeyExamples() {
  console.log("=== Pubkey Utilities ===\n");
  
  // Create pubkey from base58 string
  const pubkey1 = pubkeyFromBase58("11111111111111111111111111111111");
  console.log("1. From base58:", pubkeyToBase58(pubkey1));
  
  // Create pubkey from bytes
  const bytes = new Uint8Array(32).fill(1);
  const pubkey2 = pubkeyFromBytes(bytes);
  console.log("2. From bytes:", pubkeyToBase58(pubkey2));
  
  // Convert pubkey back to bytes
  const bytesBack = pubkeyToBytes(pubkey2);
  console.log("3. To bytes length:", bytesBack.length);
  
  // Default pubkey (all zeros)
  console.log("4. Default pubkey:", pubkeyToBase58(pubkeyDefault));
  
  // Generate dummy pubkey (for testing)
  const dummyPubkey = pubkeyNewDummy();
  console.log("5. Dummy pubkey:", pubkeyToBase58(dummyPubkey));
  
  // Find PDA (Program Derived Address)
  const programId = pubkeyFromBase58("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
  const seeds = [utf8Encode("metadata")];
  const pda = pubkeyFindPdaAddress(programId, seeds);
  console.log("6. PDA address:", pubkeyToBase58(pda));
  
  console.log();
}

// ============================================================================
// Signer Examples
// ============================================================================

async function signerExamples() {
  console.log("=== Signer Utilities ===\n");
  
  // Generate a new random signer (keypair)
  const newSigner = await signerGenerate();
  console.log("1. New signer address:", pubkeyToBase58(newSigner.address));
  
  // Sign a message
  const message = utf8Encode("Hello, Solana!");
  const signature = await newSigner.sign(message);
  console.log("2. Signature length:", signature.length, "bytes");
  
  // Create signer from existing secret key
  const secretKey = new Uint8Array(64); // Your 64-byte secret key here
  // const existingSigner = await signerFromSecret(secretKey);
  // console.log("3. Signer from secret:", pubkeyToBase58(existingSigner.address));
  
  console.log();
}

// ============================================================================
// Base Encoding Examples
// ============================================================================

function baseEncodingExamples() {
  console.log("=== Base Encoding Utilities ===\n");
  
  const data = new Uint8Array([1, 2, 3, 4, 5]);
  
  // Base58 encoding (commonly used for Solana addresses)
  const base58String = base58Encode(data);
  console.log("1. Base58 encoded:", base58String);
  const base58Decoded = base58Decode(base58String);
  console.log("   Base58 decoded:", Array.from(base58Decoded));
  
  // Base64 encoding
  const base64String = base64Encode(data);
  console.log("2. Base64 encoded:", base64String);
  const base64Decoded = base64Decode(base64String);
  console.log("   Base64 decoded:", Array.from(base64Decoded));
  
  // Base16 (hex) encoding
  const base16String = base16Encode(data);
  console.log("3. Base16 encoded:", base16String);
  const base16Decoded = base16Decode(base16String);
  console.log("   Base16 decoded:", Array.from(base16Decoded));
  
  console.log();
}

// ============================================================================
// Lamports Examples
// ============================================================================

function lamportsExamples() {
  console.log("=== Lamports Utilities ===\n");
  
  // Convert SOL to lamports (1 SOL = 1,000,000,000 lamports)
  const oneSol = approximateLamportsForSols(1);
  console.log("1. 1 SOL in lamports:", oneSol);
  
  const halfSol = approximateLamportsForSols(0.5);
  console.log("2. 0.5 SOL in lamports:", halfSol);
  
  // Convert lamports to SOL
  const lamports = 1500000000n;
  const sol = approximateSolsForLamports(lamports);
  console.log("3. 1,500,000,000 lamports in SOL:", sol);
  
  // Get fee per signature (5000 lamports = 0.000005 SOL)
  const feePerSig = lamportsFeePerSignature;
  console.log("4. Fee per signature:", feePerSig, "lamports");
  console.log("   In SOL:", approximateSolsForLamports(feePerSig));
  
  // Calculate rent exemption for account space
  const spaceInBytes = 165; // Example: token account
  const rentExemption = lamportsRentExemptionMinimumForSpace(spaceInBytes);
  console.log("5. Rent exemption for", spaceInBytes, "bytes:", rentExemption, "lamports");
  console.log("   In SOL:", approximateSolsForLamports(rentExemption));
  
  console.log();
}

// ============================================================================
// UTF-8 Examples
// ============================================================================

function utf8Examples() {
  console.log("=== UTF-8 Utilities ===\n");
  
  // Encode string to bytes
  const text = "Hello, Solana! 🚀";
  const encoded = utf8Encode(text);
  console.log("1. Encoded text:", Array.from(encoded));
  
  // Decode bytes to string
  const decoded = utf8Decode(encoded);
  console.log("2. Decoded text:", decoded);
  
  // Works with emojis and unicode
  const emoji = "🌟✨💎";
  const emojiEncoded = utf8Encode(emoji);
  const emojiDecoded = utf8Decode(emojiEncoded);
  console.log("3. Emoji roundtrip:", emoji, "→", emojiDecoded);
  
  console.log();
}

// ============================================================================
// Signature Examples
// ============================================================================

function signatureExamples() {
  console.log("=== Signature Utilities ===\n");
  
  // Create a dummy signature (64 bytes)
  const signatureBytes = new Uint8Array(64).fill(42);
  const signature = signatureFromBytes(signatureBytes);
  console.log("1. Signature (base58):", signature);
  
  // Convert signature back to bytes
  const bytesBack = signatureToBytes(signature);
  console.log("2. Signature bytes length:", bytesBack.length);
  console.log("3. First few bytes:", Array.from(bytesBack.slice(0, 8)));
  
  console.log();
}

// ============================================================================
// JSON Utilities Examples
// ============================================================================

function jsonUtilitiesExamples() {
  console.log("=== JSON Utilities ===\n");
  
  // Check if one object is a deep subset of another
  const obj1 = { a: 1, b: { c: 2, d: 3 }, e: [4, 5] };
  const obj2 = { a: 1, b: { c: 2 } };
  const obj3 = { a: 1, b: { c: 999 } };
  
  console.log("1. Object 1:", JSON.stringify(obj1));
  console.log("   Object 2:", JSON.stringify(obj2));
  console.log("   Is obj2 subset of obj1?", jsonIsDeepSubset(obj2, obj1));
  
  console.log("2. Object 3:", JSON.stringify(obj3));
  console.log("   Is obj3 subset of obj1?", jsonIsDeepSubset(obj3, obj1));
  
  // Get value at specific path
  const complexObj = {
    user: {
      profile: {
        name: "Alice",
        age: 30,
      },
      tokens: [
        { symbol: "SOL", amount: 10 },
        { symbol: "USDC", amount: 100 },
      ],
    },
  };
  
  const name = jsonGetAt(complexObj, ["user", "profile", "name"]);
  console.log("\n3. Get nested value:");
  console.log("   Path: user.profile.name");
  console.log("   Value:", name);
  
  const firstToken = jsonGetAt(complexObj, ["user", "tokens", 0, "symbol"]);
  console.log("\n4. Get array element:");
  console.log("   Path: user.tokens[0].symbol");
  console.log("   Value:", firstToken);
  
  console.log();
}

// ============================================================================
// Main Example Runner
// ============================================================================

async function main() {
  console.log("========================================");
  console.log("Solana-KISS Utility Functions Examples");
  console.log("========================================\n");
  
  pubkeyExamples();
  await signerExamples();
  baseEncodingExamples();
  lamportsExamples();
  utf8Examples();
  signatureExamples();
  jsonUtilitiesExamples();
  
  console.log("All utility examples completed!");
}

// Uncomment to run examples:
// main().catch(console.error);

export {
  pubkeyExamples,
  signerExamples,
  baseEncodingExamples,
  lamportsExamples,
  utf8Examples,
  signatureExamples,
  jsonUtilitiesExamples,
};
