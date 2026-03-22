import { Pubkey } from "./Pubkey";

/** Describes a single Solana instruction. */
export type InstructionRequest = {
  /** The on-chain address of the program that will process this instruction. */
  programAddress: Pubkey;
  /** Ordered list of account inputs required by the instruction. */
  instructionInputs: Array<InstructionInput>;
  /** Serialised instruction arguments, including any discriminator bytes. */
  instructionData: Uint8Array;
};

/** Account input for a Solana instruction. */
export type InstructionInput = {
  /** The public key of the account. */
  address: Pubkey;
  /** `true` if the account must provide a signature for this transaction. */
  signer: boolean;
  /** `true` if the instruction may modify this account. */
  writable: boolean;
};
