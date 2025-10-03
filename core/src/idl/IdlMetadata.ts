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

export function idlMetadataParse(value: JsonValue): IdlMetadata {
  return (
    infoJsonDecode(value) ?? {
      name: undefined,
      docs: undefined,
      description: undefined,
      address: undefined,
      version: undefined,
      spec: undefined,
    }
  );
}

const infoJsonDecode = jsonDecoderOptional(
  jsonDecoderObject({
    name: jsonDecoderOptional(jsonDecodeString),
    docs: jsonDecoderOptional(jsonDecodeValue),
    description: jsonDecoderOptional(jsonDecodeString),
    address: jsonDecoderOptional(jsonDecodeString),
    version: jsonDecoderOptional(jsonDecodeString),
    spec: jsonDecoderOptional(jsonDecodeString),
  }),
);
