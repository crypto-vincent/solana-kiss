import { Instruction } from "../data/Instruction";
import { JsonValue } from "../data/Json";
import { Message } from "../data/Message";

export type Commitment = "confirmed" | "finalized";

// TODO - should add phantom integration (maybe different package?)
// TODO - should integrate indexing capabilities ?
// TODO - where should this be located ?
export type Blockslot = number;

export type Transaction = {
  message: Message;
  blockslot: Blockslot;
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
