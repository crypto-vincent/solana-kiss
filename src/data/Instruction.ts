import {
  jsonCodecNumber,
  jsonCodecString,
  jsonDecoderArray,
  jsonDecoderObject,
  jsonDecoderOptional,
} from "./Json";
import { Pubkey } from "./Pubkey";

export type Instruction = {
  programAddress: Pubkey;
  inputs: Array<InstructionInput>;
  data: Uint8Array;
};

// TODO - naming transaction input is used in other places, should we rename this ?
export type InstructionInput = {
  address: Pubkey;
  signing: boolean;
  writable: boolean;
};

export const compiledInstructionsJsonDecoder = jsonDecoderArray(
  jsonDecoderObject(
    {
      stackHeight: jsonCodecNumber.decoder,
      programIndex: jsonCodecNumber.decoder,
      accountsIndexes: jsonDecoderArray(jsonCodecNumber.decoder),
      dataBase58: jsonCodecString.decoder,
    },
    {
      stackHeight: "stackHeight",
      programIndex: "programIdIndex",
      accountsIndexes: "accounts",
      dataBase58: "data",
    },
  ),
);

export const innerInstructionsJsonDecoder = jsonDecoderOptional(
  jsonDecoderArray(
    jsonDecoderObject({
      index: jsonCodecNumber.decoder,
      instructions: compiledInstructionsJsonDecoder,
    }),
  ),
);
