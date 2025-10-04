import { Instruction, JsonValue, Lamports, Message } from "solana-kiss-data";

export type Commitment = "confirmed" | "finalized";

// TODO - should integrate indexing capabilities ?
// TODO - where should this be located ?
export type Slot = number;

export type Transaction = {
  message: Message;
  slot: Slot;
  processedTime: Date | undefined;
  error: JsonValue | undefined;
  logs: Array<string> | undefined;
  chargedFees: Lamports;
  consumedComputeUnits: number;
  invocations: Array<Invocation>;
};

export type Invocation = {
  instruction: Instruction;
  invocations: Array<Invocation>;
};
