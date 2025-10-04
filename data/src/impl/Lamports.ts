export type Lamports = bigint;

export function approximateSolsForLamports(lamports: Lamports): number {
  return Number(lamports) / Number(1_000_000_000);
}

export function approximateLamportsForSols(sols: number): Lamports {
  return BigInt(Math.floor(sols * 1_000_000_000));
}

export function lamportsRentExemptionMinimumForSpace(space: number): Lamports {
  const storageOverheadBytes = 128;
  const lamportPerByteYear = 3480;
  const minimumPaidYearsForExemption = 2;
  return (
    BigInt(storageOverheadBytes + space) *
    BigInt(lamportPerByteYear) *
    BigInt(minimumPaidYearsForExemption)
  );
}

export const lamportsFeePerSigner = 5000n;
