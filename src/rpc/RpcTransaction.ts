import { BlockSlot } from "../data/Block";
import { Instruction } from "../data/Instruction";
import { JsonValue } from "../data/Json";
import { Message } from "../data/Message";

// TODO (external) - should add phantom integration (maybe different package?)
// TODO (external) - should integrate indexing capabilities ? (maybe different package?)

// TODO (naming) - rpc transaction naming convention ?
export type RpcTransactionExecution = {
  blockInfo: {
    time: Date | undefined;
    slot: BlockSlot;
  };
  message: Message;
  logs: Array<string> | undefined;
  error: JsonValue | undefined;
  consumedComputeUnits: number;
  chargedFeesLamports: bigint | undefined;
};

export type RpcTransactionInvoke = {
  instruction: Instruction;
  callStack: RpcTransactionCallStack;
  error: string | undefined;
  returnData: Uint8Array | undefined;
  consumedComputeUnits: number | undefined;
};

export type RpcTransactionCallStack = Array<
  | { invoke: RpcTransactionInvoke }
  | { data: Uint8Array }
  | { log: string }
  | { unknown: string }
>;
