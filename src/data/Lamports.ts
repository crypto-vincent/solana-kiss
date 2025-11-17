export function approximateSolsForLamports(lamports: bigint): number {
  return Number(lamports) / Number(1_000_000_000);
}

export function approximateLamportsForSols(sols: number): bigint {
  return BigInt(Math.floor(sols * 1_000_000_000));
}

export function lamportsRentExemptionMinimumForSpace(space: number): bigint {
  const storageBytesNeeded = 128n + BigInt(space);
  return storageBytesNeeded * lamportsFeePerBytePerYear * 2n;
}

export const lamportsFeePerBytePerYear = 3480n;
export const lamportsFeePerSignature = 5000n;
