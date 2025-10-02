import {
  jsonDecoderObject,
  jsonDecoderOptional,
  jsonDecodeString,
  jsonDecodeValue,
  JsonValue,
} from "../data/Json";
import { Pubkey } from "../data/Pubkey";

export type IdlMetadata = {
  name: string | undefined;
  docs: JsonValue | undefined;
  description: string | undefined;
  address: Pubkey | undefined;
  version: string | undefined;
  spec: string | undefined;
};

export const idlMetadataDecode = jsonDecoderObject({
  name: jsonDecoderOptional(jsonDecodeString),
  docs: jsonDecoderOptional(jsonDecodeValue),
  description: jsonDecoderOptional(jsonDecodeString),
  address: jsonDecoderOptional(jsonDecodeString),
  version: jsonDecoderOptional(jsonDecodeString),
  spec: jsonDecoderOptional(jsonDecodeString),
});
