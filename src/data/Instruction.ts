import { Pubkey } from "./Pubkey";

/**
 * Describes a single Solana instruction to be included in a transaction.
 * Contains the program address, account inputs, and encoded instruction data.
 */
export type InstructionRequest = {
  programAddress: Pubkey;
  instructionInputs: Array<InstructionInput>;
  instructionData: Uint8Array;
};
/**
 * Describes an account input for a Solana instruction.
 * Specifies the account address and its required access permissions.
 * - `signer`: whether the account must sign the transaction.
 * - `writable`: whether the account's data or lamports may be modified.
 */
export type InstructionInput = {
  address: Pubkey;
  signer: boolean;
  writable: boolean;
};
