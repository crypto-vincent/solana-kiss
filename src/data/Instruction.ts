import { JsonValue } from "./Json";
import { Pubkey } from "./Pubkey";

export type InstructionFrame = {
  addresses: InstructionAddresses;
  payload?: JsonValue | undefined;
};

export type InstructionAddresses = {
  [accountField: string]: Pubkey;
};

export type InstructionRequest = {
  programAddress: Pubkey;
  inputs: Array<InstructionInput>;
  data: Uint8Array;
};

export type InstructionInput = {
  address: Pubkey;
  signer: boolean;
  writable: boolean;
};
