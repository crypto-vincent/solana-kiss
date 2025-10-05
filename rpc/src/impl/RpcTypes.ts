import { Instruction, JsonValue, Message } from "solana-kiss-data";

export type Commitment = "confirmed" | "finalized";

// TODO - should integrate indexing capabilities ?
// TODO - where should this be located ?
export type Slot = number;

export type Transaction = {
  message: Message;
  slot: Slot;
  error: JsonValue | undefined;
  logs: Array<string> | undefined;
  processedTime: Date | undefined;
  chargedFeesLamports: bigint;
  consumedComputeUnits: number;
  invocations: Array<Invocation>;
};

export type Invocation = {
  instruction: Instruction;
  invocations: Array<Invocation>;
};
