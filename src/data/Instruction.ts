import { Pubkey } from "./Pubkey";

// TODO (naming) - rename InstructionRequest or InstructionCall or InstructionInvocation ?
export type Instruction = {
  programAddress: Pubkey;
  inputs: Array<InstructionInput>;
  data: Uint8Array;
};

export type InstructionInput = {
  address: Pubkey;
  signer: boolean;
  writable: boolean;
};
