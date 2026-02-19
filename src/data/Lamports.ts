/**
 * Converts a lamport amount to an approximate SOL value.
 * @param lamports - The lamport amount (1 SOL = 1,000,000,000 lamports).
 * @returns An approximate SOL value as a floating-point number.
 */
export function approximateSolsForLamports(lamports: bigint): number {
  return Number(lamports) / Number(1_000_000_000);
}

/**
 * Converts a SOL amount to an approximate lamport value (truncated toward zero).
 * @param sols - The SOL amount as a floating-point number.
 * @returns An approximate lamport amount as a `bigint`.
 */
export function approximateLamportsForSols(sols: number): bigint {
  return BigInt(Math.floor(sols * 1_000_000_000));
}

/**
 * Calculates the minimum rent-exemption lamport balance for an account of the given size.
 * Uses the formula: `(128 + space) * lamportsFeePerBytePerYear * 2`,
 * where 128 accounts for the fixed account metadata overhead in bytes.
 * @param space - The account data size in bytes.
 * @returns The minimum lamport balance required for rent exemption.
 */
export function lamportsRentExemptionMinimumForSpace(space: number): bigint {
  return (128n + BigInt(space)) * lamportsFeePerBytePerYear * 2n;
}

/** Rent fee in lamports per byte per year (3480 lamports). */
export const lamportsFeePerBytePerYear = 3480n;
/** Transaction fee in lamports per signature (5000 lamports). */
export const lamportsFeePerSignature = 5000n;
