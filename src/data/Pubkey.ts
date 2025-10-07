import { base58Decode, base58Encode } from "./Base58";
import { sha256Hash } from "./Sha256";
import { Signature, signatureToBytes } from "./Signature";

export type Pubkey =
  | (string & { readonly __brand: unique symbol })
  | { readonly __brand: unique symbol };

export const pubkeyDefault = pubkeyFromBytes(new Uint8Array(32));

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

export function pubkeyFromBase58(base58: string): Pubkey {
  const bytes = base58Decode(base58);
  pubkeyBytesCheck(bytes);
  return base58 as Pubkey;
}

export function pubkeyFromBytes(bytes: Uint8Array): Pubkey {
  pubkeyBytesCheck(bytes);
  const pubkey = base58Encode(bytes);
  return pubkey as Pubkey;
}

export function pubkeyToBytes(value: Pubkey): Uint8Array {
  const bytes = base58Decode(value as string);
  pubkeyBytesCheck(bytes);
  return bytes;
}

export function pubkeyToBase58(value: Pubkey): string {
  return value as string;
}

export function pubkeyFindPdaAddress(
  programAddress: Pubkey,
  seedsBlobs: Array<Uint8Array>,
): Pubkey {
  return pubkeyFindPdaAddressAndBump(programAddress, seedsBlobs).address;
}

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

export function pubkeyCreatePdaAddress(
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

export function pubkeyCreateFromSeed(
  signerAddress: Pubkey,
  seedUtf8: string,
  ownerAddress: Pubkey,
): Pubkey {
  if (seedUtf8.length > 32) {
    throw new Error(`Pubkey: Create: Seed length must not exceed 32 bytes`);
  }
  return pubkeyFromBytes(
    sha256Hash([
      pubkeyToBytes(signerAddress),
      new TextEncoder().encode(seedUtf8),
      pubkeyToBytes(ownerAddress),
    ]),
  );
}

export async function pubkeyToVerifier(pubkey: Pubkey) {
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
    ...pubkeyToBytes(pubkey),
  ]);
  const cryptoKey = await crypto.subtle.importKey(
    "spki",
    spkiBytes,
    { name: "Ed25519" },
    true,
    ["verify"],
  );
  return async (signature: Signature, message: Uint8Array) => {
    return await crypto.subtle.verify(
      "Ed25519",
      cryptoKey,
      signatureToBytes(signature) as BufferSource,
      message as BufferSource,
    );
  };
}

export function pubkeyIsOnCurve(address: Pubkey): boolean {
  const bytes = pubkeyToBytes(address);
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

const pdaMarker = new TextEncoder().encode("ProgramDerivedAddress");

function pubkeyBytesCheck(bytes: Uint8Array) {
  if (bytes.length !== 32) {
    throw new Error(
      `Pubkey: Expected pubkey spanning 32 bytes (found: ${bytes.length})`,
    );
  }
}
