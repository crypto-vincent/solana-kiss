import { Pubkey, pubkeyFromBase58 } from "./Pubkey";

/** The on-chain address of the Clock sysvar. */
export const splSysvarClockAddress: Pubkey = pubkeyFromBase58(
  "SysvarC1ock11111111111111111111111111111111",
);

/** The on-chain address of the Rent sysvar. */
export const splSysvarRentAddress: Pubkey = pubkeyFromBase58(
  "SysvarRent111111111111111111111111111111111",
);

/** The on-chain address of the Fees sysvar. */
export const splSysvarFeesAddress: Pubkey = pubkeyFromBase58(
  "SysvarFees111111111111111111111111111111111",
);

/** The on-chain address of the Instructions sysvar. */
export const splSysvarInstructionsAddress: Pubkey = pubkeyFromBase58(
  "Sysvar1nstructions1111111111111111111111111",
);

/** The on-chain address of the System program. */
export const splSystemProgramAddress: Pubkey = pubkeyFromBase58(
  "11111111111111111111111111111111",
);

/** The on-chain address of the Address Lookup Table program. */
export const splAddressLookupProgramAddress: Pubkey = pubkeyFromBase58(
  "AddressLookupTab1e1111111111111111111111111",
);

/** The on-chain address of the Compute Budget program. */
export const splComputeBudgetProgramAddress: Pubkey = pubkeyFromBase58(
  "ComputeBudget111111111111111111111111111111",
);

/** The on-chain address of the SPL Token program. */
export const splTokenProgramAddress: Pubkey = pubkeyFromBase58(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
);

/** The on-chain address of the SPL Associated Token Account program. */
export const splAssociatedTokenProgramAddress: Pubkey = pubkeyFromBase58(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
);

/** The on-chain address of the SPL Name Service program. */
export const splNameServiceProgramAddress: Pubkey = pubkeyFromBase58(
  "namesLPneVptA9Z5rqUDD9tMTWEJwofgaYwp8cawRkX",
);
