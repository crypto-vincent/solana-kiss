import { BlockSlot } from "../data/Block";
import { Instruction } from "../data/Instruction";
import { JsonValue } from "../data/Json";
import { Message } from "../data/Message";

export type Commitment = "confirmed" | "finalized";

// TODO - should add phantom integration (maybe different package?)
// TODO - should integrate indexing capabilities ?
// TODO - where should this be located ?

export type Transaction = {
  block: {
    time: Date | undefined;
    slot: BlockSlot;
  };
  message: Message;
  error: JsonValue | undefined;
  logs: Array<string> | undefined;
  chargedFeesLamports: bigint;
  consumedComputeUnits: number;
  invocations: Array<TransactionInvocation>;
};

export type TransactionInvocation = {
  instruction: Instruction;
  invocations: Array<TransactionInvocation>;
};
