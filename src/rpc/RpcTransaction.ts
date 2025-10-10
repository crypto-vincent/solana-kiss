import { BlockSlot } from "../data/Block";
import { Instruction } from "../data/Instruction";
import { JsonValue } from "../data/Json";
import { Message } from "../data/Message";

// TODO - add FindBlocks (forward and backward?) capabilities ?
// TODO - should add phantom integration (maybe different package?)
// TODO - should integrate indexing capabilities ?

// TODO - rpc transaction naming ?
export type RpcTransactionExecution = {
  blockInfo: {
    time: Date | undefined;
    slot: BlockSlot;
  };
  message: Message;
  chargedFeesLamports: bigint;
  consumedComputeUnits: number;
  logs: Array<string> | undefined;
  error: JsonValue | undefined;
};

export type RpcTransactionFlow = Array<
  | { unknown: string }
  | { log: string }
  | { data: Uint8Array }
  | {
      call: {
        instruction: Instruction;
        calls: RpcTransactionFlow;
        consumedComputeUnits: number | undefined;
        error: string | undefined;
        returnData: Uint8Array | undefined;
      };
    }
>;
