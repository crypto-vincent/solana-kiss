import { pubkeyFromBase58 } from "./Pubkey";

/** The on-chain address of the SPL Token program. */
export const splTokenProgramAddress = pubkeyFromBase58(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
);
/** The on-chain address of the SPL Associated Token Account program. */
export const splAssociatedTokenProgramAddress = pubkeyFromBase58(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
);
