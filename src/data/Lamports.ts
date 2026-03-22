/**
 * Converts lamports to approximate SOL.
 * @param lamports - Lamport amount (1 SOL = 1,000,000,000 lamports).
 * @returns Approximate SOL as a float.
 */
export function approximateSolsForLamports(lamports: bigint): number {
  return Number(lamports) / Number(1_000_000_000);
}

/**
 * Converts SOL to approximate lamports (truncated toward zero).
 * @param sols - SOL amount.
 * @returns Approximate lamports as `bigint`.
 */
export function approximateLamportsForSols(sols: number): bigint {
  return BigInt(Math.floor(sols * 1_000_000_000));
}

/**
 * Minimum rent-exemption lamports for an account of `space` bytes.
 * Formula: `(128 + space) * lamportsFeePerBytePerYear * 2`.
 * @param space - Account data size in bytes.
 * @returns Minimum lamport balance for rent exemption.
 */
export function lamportsRentExemptionMinimumForSpace(space: number): bigint {
  return (128n + BigInt(space)) * lamportsFeePerBytePerYear * 2n;
}

/** Rent fee in lamports per byte per year (3480 lamports). */
export const lamportsFeePerBytePerYear = 3480n;
/** Transaction fee in lamports per signature (5000 lamports). */
export const lamportsFeePerSignature = 5000n;
