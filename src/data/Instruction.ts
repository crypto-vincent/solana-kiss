import { Pubkey } from "./Pubkey";

/**
 * Describes a single Solana instruction to be included in a transaction.
 * Contains the program address, account inputs, and encoded instruction data.
 */
export type InstructionRequest = {
  /** The on-chain address of the program that will process this instruction. */
  programAddress: Pubkey;
  /** Ordered list of account inputs required by the instruction. */
  instructionInputs: Array<InstructionInput>;
  /** The serialised instruction arguments, including any leading discriminator bytes. */
  instructionData: Uint8Array;
};

/**
 * Describes an account input for a Solana instruction.
 * Specifies the account address and its required access permissions.
 */
export type InstructionInput = {
  /** The public key of the account. */
  address: Pubkey;
  /** `true` if the account must provide a signature for this transaction. */
  signer: boolean;
  /** `true` if the instruction may modify the account's data or lamport balance. */
  writable: boolean;
};
