import { BlockSlot } from "./Block";
import { Instruction } from "./Instruction";
import {
  jsonCodecPubkey,
  jsonCodecString,
  jsonDecoderArray,
  jsonDecoderObject,
  jsonDecoderOptional,
  JsonValue,
} from "./Json";
import { Message } from "./Message";

// TODO - should add phantom integration (maybe different package?)
// TODO - should integrate indexing capabilities ?

// TODO - rpc transaction naming ?
export type Transaction = {
  block: {
    time: Date | undefined;
    slot: BlockSlot;
  };
  message: Message;
  chargedFeesLamports: bigint;
  consumedComputeUnits: number;
  error: JsonValue | undefined;
  logs: Array<string> | undefined;
  invocations: Array<TransactionInvocation> | undefined;
};

export type TransactionInvocation = {
  instruction: Instruction;
  invocations: Array<TransactionInvocation>;
};

export const transactionLoadedAddressesJsonDecoder = jsonDecoderOptional(
  jsonDecoderObject({
    writable: jsonDecoderArray(jsonCodecPubkey.decoder),
    readonly: jsonDecoderArray(jsonCodecPubkey.decoder),
  }),
);

export const transactionLogsMessagesJsonDecoder = jsonDecoderOptional(
  jsonDecoderArray(jsonCodecString.decoder),
);
