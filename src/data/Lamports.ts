/** Converts lamports to an approximate SOL amount. */

export function approximateSolsForLamports(lamports: bigint): number {
  return Number(lamports) / Number(1_000_000_000);
}

/** Converts SOL to an approximate lamport amount. */

export function approximateLamportsForSols(sols: number): bigint {
  return BigInt(Math.floor(sols * 1_000_000_000));
}

/** Calculates the minimum lamports for rent exemption by space. */

export function lamportsRentExemptionMinimumForSpace(space: number): bigint {
  return (128n + BigInt(space)) * lamportsFeePerBytePerYear * 2n;
}

export const lamportsFeePerBytePerYear = 3480n;
export const lamportsFeePerSignature = 5000n;
