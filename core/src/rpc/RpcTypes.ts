import { Instruction, JsonValue, Lamports, Message } from "..";

// TODO - where should this be located ?

export type Commitment = "confirmed" | "finalized";

export type Slot = number;

export type Transaction = {
  slot: Slot;
  message: Message;
  error: JsonValue | undefined;
  logs: Array<string>;
  chargedFees: Lamports;
  consumedComputeUnits: number;
  invocations: Array<Invocation>;
};

export type Invocation = {
  instruction: Instruction;
  invocations: Array<Invocation>;
};
