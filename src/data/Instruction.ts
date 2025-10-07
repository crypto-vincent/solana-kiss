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

export type InstructionInput = {
  address: Pubkey;
  signing: boolean;
  writable: boolean;
};

export const compiledInstructionsJsonDecoder = jsonDecoderArray(
  jsonDecoderObject(
    {
      stackHeight: "stackHeight",
      programIndex: "programIdIndex",
      accountsIndexes: "accounts",
      dataBase58: "data",
    },
    {
      stackHeight: jsonTypeNumber.decoder,
      programIndex: jsonTypeNumber.decoder,
      accountsIndexes: jsonDecoderArray(jsonTypeNumber.decoder),
      dataBase58: jsonTypeString.decoder,
    },
  ),
);

export const innerInstructionsJsonDecoder = jsonDecoderOptional(
  jsonDecoderArray(
    jsonDecoderObject((key) => key, {
      index: jsonTypeNumber.decoder,
      instructions: compiledInstructionsJsonDecoder,
    }),
  ),
);
