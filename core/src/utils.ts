import { Lamports } from './types';

export function approximateSolsForLamports(lamports: Lamports): number {
  return Number(lamports) / Number(1_000_000_000);
}
