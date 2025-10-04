export type Lamports = bigint;

export function approximateSolsForLamports(lamports: Lamports): number {
  return Number(lamports) / Number(1_000_000_000);
}

export function approximateLamportsForSols(sols: number): Lamports {
  return BigInt(Math.floor(sols * 1_000_000_000));
}

export function lamportsRentExemptionMinimumForSpace(space: number): Lamports {
  const storageBytesNeeded = 128n + BigInt(space);
  return storageBytesNeeded * lamportsFeePerBytePerYear * 2n;
}

export const lamportsFeePerBytePerYear = 3480n;
export const lamportsFeePerSigner = 5000n;
