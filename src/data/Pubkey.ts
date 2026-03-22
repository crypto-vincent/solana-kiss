import { base58BytesLength, base58Decode, base58Encode } from "./Base58";
import { sha256Hash } from "./Sha256";
import { Signature, signatureToBytes } from "./Signature";
import { TransactionMessage } from "./Transaction";
import { utf8Encode } from "./Utf8";
import { Branded } from "./Utils";

/** A branded string type representing a Solana public key encoded in base58. */
export type Pubkey = Branded<string, "Pubkey">;

/** The default public key whose underlying 32 bytes are all zero. */
export const pubkeyDefault = pubkeyFromBytes(new Uint8Array(32));

/**
 * Dummy public key with a fixed prefix and random remaining bytes (for testing).
 * @returns Randomly generated dummy {@link Pubkey}.
 */
export function pubkeyNewDummy(): Pubkey {
  const bytes = new Uint8Array(32);
  bytes[0] = 0x03;
  bytes[1] = 0x4e;
  bytes[2] = 0xa3;
  bytes[3] = 0xa1;
  bytes[4] = 0xa5;
  for (let i = 5; i < 32; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return base58Encode(bytes) as Pubkey;
}

/**
 * Creates a {@link Pubkey} from a Base58 string.
 * @param base58 - Base58-encoded public key.
 * @returns Validated {@link Pubkey}.
 * @throws If decoded bytes are not 32 bytes.
 */
export function pubkeyFromBase58(base58: string): Pubkey {
  pubkeyBytesLengthCheck(base58BytesLength(base58));
  return base58 as Pubkey;
}

/**
 * Creates a {@link Pubkey} from 32 bytes.
 * @param bytes - Exactly 32 bytes.
 * @returns Base58-encoded {@link Pubkey}.
 * @throws If not 32 bytes.
 */
export function pubkeyFromBytes(bytes: Uint8Array): Pubkey {
  pubkeyBytesLengthCheck(bytes.length);
  return base58Encode(bytes) as Pubkey;
}

/**
 * Decodes a {@link Pubkey} to raw bytes.
 * @param self - Public key to decode.
 * @returns 32-byte `Uint8Array`.
 * @throws If decoded bytes are not 32 bytes.
 */
export function pubkeyToBytes(self: Pubkey): Uint8Array {
  return base58Decode(self as string);
}

/**
 * Returns the Base58 string of a {@link Pubkey}.
 * @param self - Public key.
 * @returns Base58 string.
 */
export function pubkeyToBase58(self: Pubkey): string {
  return self as string;
}

/**
 * Finds a PDA for the given program and seeds (bump 255→0).
 * @param programAddress - Program's public key.
 * @param seedsBlobs - Seed byte buffers.
 * @returns Off-curve derived {@link Pubkey}.
 * @throws If no valid PDA is found.
 */
export function pubkeyFindPdaAddress(
  programAddress: Pubkey,
  seedsBlobs: Array<Uint8Array>,
): Pubkey {
  return pubkeyFindPdaAddressAndBump(programAddress, seedsBlobs).address;
}

/**
 * Finds a PDA and its bump seed (255→0).
 * @param programAddress - Program's public key.
 * @param seedsBlobs - Seed byte buffers.
 * @returns `{ address, bump }` for the first valid off-curve PDA.
 * @throws If no valid PDA is found.
 */
export function pubkeyFindPdaAddressAndBump(
  programAddress: Pubkey,
  seedsBlobs: Array<Uint8Array>,
): { address: Pubkey; bump: number } {
  const seedBump = new Uint8Array([0]);
  for (let bump = 255; bump >= 0; bump--) {
    seedBump[0] = bump;
    const pdaAddress = pubkeyCreatePdaAddress(programAddress, [
      ...seedsBlobs,
      seedBump,
    ]);
    if (pdaAddress !== undefined) {
      return { address: pdaAddress, bump };
    }
  }
  throw new Error(
    "Pubkey: Find PDA with bump: Unable to find a viable program derived address with the given seeds",
  );
}

/**
 * Derives a public key via `createWithSeed` (SHA-256 of base + seed + owner).
 * @param baseAddress - Base public key.
 * @param seedUtf8 - UTF-8 seed string (max 32 bytes).
 * @param ownerAddress - Owner program's public key.
 * @returns Derived {@link Pubkey}.
 * @throws If seed exceeds 32 bytes.
 */
export function pubkeyCreateFromSeed(
  baseAddress: Pubkey,
  seedUtf8: string,
  ownerAddress: Pubkey,
): Pubkey {
  const seedBytes = utf8Encode(seedUtf8);
  if (seedBytes.length > 32) {
    throw new Error(`Pubkey: Create: Seed length must not exceed 32 bytes`);
  }
  return pubkeyFromBytes(
    sha256Hash([
      pubkeyToBytes(baseAddress),
      seedBytes,
      pubkeyToBytes(ownerAddress),
    ]),
  );
}

/**
 * Imports a {@link Pubkey} as a Web Crypto Ed25519 verifier function.
 * @param self - Public key to import.
 * @returns Async function that verifies a {@link Signature} against a message.
 */
export async function pubkeyToVerifier(self: Pubkey) {
  const spkiBytes = new Uint8Array([
    0x30,
    0x2a,
    0x30,
    0x05,
    0x06,
    0x03,
    0x2b,
    0x65,
    0x70,
    0x03,
    0x21,
    0x00,
    ...pubkeyToBytes(self),
  ]);
  const cryptoKey = await crypto.subtle.importKey(
    "spki",
    spkiBytes,
    { name: "Ed25519" },
    true,
    ["verify"],
  );
  return async (
    signature: Signature,
    message: TransactionMessage | Uint8Array,
  ) => {
    return crypto.subtle.verify(
      "Ed25519",
      cryptoKey,
      signatureToBytes(signature) as BufferSource,
      message as BufferSource,
    );
  };
}

/**
 * Checks whether a {@link Pubkey} lies on the Ed25519 curve. Off-curve keys are used as PDAs.
 * @param self - Public key to check.
 * @returns `true` if on the curve.
 */
export function pubkeyIsOnCurve(self: Pubkey): boolean {
  const bytes = pubkeyToBytes(self);
  const sign = (bytes[31]! >> 7) & 1;
  bytes[31]! &= 0x7f;
  let y = 0n;
  for (let byteIndex = 0; byteIndex < 32; byteIndex++) {
    y |= BigInt(bytes[byteIndex]!) << (8n * BigInt(byteIndex));
  }
  if (y >= fieldModulusP) {
    return false;
  }
  const y2 = mod(y * y);
  const u = mod(y2 - 1n);
  const v = mod(mod(edwardsD * y2) + 1n);
  const vinv = inv(v);
  const x2 = mod(u * vinv);
  const r = pow(x2, (fieldModulusP + 3n) / 8n);
  let x = r;
  if (mod(x * x) !== x2) {
    x = mod(x * sqrtMinus1ModP);
  }
  if (mod(x * x) !== x2) {
    return false;
  }
  if ((x & 1n) !== BigInt(sign)) {
    x = mod(fieldModulusP - x);
  }
  const lhs = mod(mod(y2 - mod(x * x)));
  const rhs = mod(1n + mod(mod(edwardsD * y2) * mod(x * x)));
  return lhs === rhs;
}

const fieldModulusP = (1n << 255n) - 19n;
const sqrtMinus1ModP =
  19681161376707505956807079304988542015446066515923890162744021073123829784752n;
const edwardsD =
  37095705934669439343138083508754565189542113879843219016388785533085940283555n;

function mod(value: bigint) {
  const r = value % fieldModulusP;
  return r >= 0n ? r : r + fieldModulusP;
}
function pow(value: bigint, exponent: bigint) {
  let r = 1n;
  let b = mod(value);
  let n = exponent;
  while (n > 0n) {
    if (n & 1n) {
      r = mod(r * b);
    }
    b = mod(b * b);
    n >>= 1n;
  }
  return r;
}
function inv(value: bigint) {
  return pow(value, fieldModulusP - 2n);
}

function pubkeyBytesLengthCheck(bytesLength: number) {
  if (bytesLength !== 32) {
    throw new Error(`Pubkey: Expected 32 bytes (found: ${bytesLength} bytes)`);
  }
}

function pubkeyCreatePdaAddress(
  programAddress: Pubkey,
  seedsBytes: Array<Uint8Array>,
): Pubkey | undefined {
  const programBytes = pubkeyToBytes(programAddress);
  if (seedsBytes.length > 16) {
    throw new Error("Pubkey: Create PDA: Too many seeds, max is 16");
  }
  for (let seedIndex = 0; seedIndex < seedsBytes.length; seedIndex++) {
    let seedBytes = seedsBytes[seedIndex]!;
    if (seedBytes.length > 32) {
      throw new Error(
        `Pubkey: Create PDA: Seed at index ${seedIndex} is too big, max is 32 bytes`,
      );
    }
  }
  const pdaAddress = pubkeyFromBytes(
    sha256Hash([...seedsBytes, programBytes, pdaMarker]),
  );
  if (pubkeyIsOnCurve(pdaAddress)) {
    return undefined;
  }
  return pdaAddress;
}

const pdaMarker = utf8Encode("ProgramDerivedAddress");
