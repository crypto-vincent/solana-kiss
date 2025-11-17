import { Pubkey } from "./Pubkey";

export type InstructionRequest = {
  programAddress: Pubkey;
  instructionInputs: Array<InstructionInput>;
  instructionData: Uint8Array;
};
export type InstructionInput = {
  address: Pubkey;
  signer: boolean;
  writable: boolean;
};
