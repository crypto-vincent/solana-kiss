import { BlockSlot } from "./Block";
import { Instruction } from "./Instruction";
import { JsonValue } from "./Json";
import { Message } from "./Message";

// TODO - should add phantom integration (maybe different package?)
// TODO - should integrate indexing capabilities ?

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
