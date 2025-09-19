import { base58Decode, base58Encode } from "./base58";
import { sha256Hash } from "./sha256";

export type Pubkey = string;

let uniqueCounter = 1n;
export function pubkeyNewDummy(): Pubkey {
  const bytes = new Uint8Array(32);
  const view = new DataView(bytes.buffer);
  view.setBigUint64(24, uniqueCounter++);
  return base58Encode(bytes);
}

export function pubkeyNewRandom(): Pubkey {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base58Encode(bytes);
}

export function pubkeyFindPdaAddress(
  programAddress: Pubkey,
  seeds: Array<Uint8Array>,
): Pubkey {
  return pubkeyFindPdaAddressWithBump(programAddress, seeds).address;
}

export function pubkeyFindPdaAddressWithBump(
  programAddress: Pubkey,
  seeds: Array<Uint8Array>,
): { address: Pubkey; bump: number } {
  const seedBump = new Uint8Array([0]);
  for (let bump = 255; bump >= 0; bump--) {
    seedBump[0] = bump;
    const pdaAddress = pubkeyCreatePdaAddress(programAddress, [
      ...seeds,
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
  seeds: Array<Uint8Array>,
): Pubkey | undefined {
  if (seeds.length > 16) {
    throw new Error("Pubkey: Create PDA: Too many seeds, max is 16");
  }
  for (const seed of seeds) {
    if (seed.length > 32) {
      // TODO - better error message
      throw new Error("Pubkey: Create PDA: Seed length too long, max is 32");
    }
  }
  const pdaAddress = base58Encode(
    sha256Hash([...seeds, base58Decode(programAddress), pdaMarker]),
  );
  if (pubkeyIsOnCurve(pdaAddress)) {
    return undefined;
  }
  return pdaAddress;
}

export function pubkeyIsOnCurve(address: Pubkey): boolean {
  const bytes = base58Decode(address);
  if (bytes.length !== 32) {
    throw new Error(
      `Pubkey: Is on curve: Invalid public key length: ${bytes.length}`,
    );
  }
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

const pdaMarker = new Uint8Array([
  80, 114, 111, 103, 114, 97, 109, 68, 101, 114, 105, 118, 101, 100, 65, 100,
  100, 114, 101, 115, 115,
]);
