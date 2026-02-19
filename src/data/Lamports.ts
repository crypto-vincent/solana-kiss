/** Converts a lamport amount to its approximate equivalent in SOL. */
export function approximateSolsForLamports(lamports: bigint): number {
  return Number(lamports) / Number(1_000_000_000);
}

/** Converts a SOL amount to its approximate equivalent in lamports. */
export function approximateLamportsForSols(sols: number): bigint {
  return BigInt(Math.floor(sols * 1_000_000_000));
}

/** Calculates the minimum lamport balance required for rent exemption given an account's data size in bytes. */
export function lamportsRentExemptionMinimumForSpace(space: number): bigint {
  return (128n + BigInt(space)) * lamportsFeePerBytePerYear * 2n;
}

export const lamportsFeePerBytePerYear = 3480n;
export const lamportsFeePerSignature = 5000n;
