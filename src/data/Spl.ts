import { pubkeyFromBase58 } from "./Pubkey";

/** The on-chain address of the Clock sysvar. */
export const splSysvarClockAddress = pubkeyFromBase58(
  "SysvarC1ock11111111111111111111111111111111",
);

/** The on-chain address of the Rent sysvar. */
export const splSysvarRentAddress = pubkeyFromBase58(
  "SysvarRent11111111111111111111111111111111",
);

/** The on-chain address of the System program. */
export const splSystemProgramAddress = pubkeyFromBase58(
  "11111111111111111111111111111111",
);

/** The on-chain address of the Address Lookup Table program. */
export const splAddressLookupProgramAddress = pubkeyFromBase58(
  "AddressLookupTab1e1111111111111111111111111",
);

/** The on-chain address of the Compute Budget program. */
export const splComputeBudgetProgramAddress = pubkeyFromBase58(
  "ComputeBudget111111111111111111111111111111",
);

/** The on-chain address of the SPL Token program. */
export const splTokenProgramAddress = pubkeyFromBase58(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
);

/** The on-chain address of the SPL Associated Token Account program. */
export const splAssociatedTokenProgramAddress = pubkeyFromBase58(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
);

/** The on-chain address of the SPL Name Service program. */
export const splNameServiceProgramAddress = pubkeyFromBase58(
  "namesLPneVptA9Z5rqUDD9tMTWEJwofgaYwp8cawRkX",
);
