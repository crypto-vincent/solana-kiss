import {
  jsonDecoderArray,
  jsonDecoderObject,
  jsonDecoderOptional,
  jsonTypeNumber,
  jsonTypeString,
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
      stackHeight: jsonTypeNumber.decoder,
      programIndex: jsonTypeNumber.decoder,
      accountsIndexes: jsonDecoderArray(jsonTypeNumber.decoder),
      dataBase58: jsonTypeString.decoder,
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
      index: jsonTypeNumber.decoder,
      instructions: compiledInstructionsJsonDecoder,
    }),
  ),
);
