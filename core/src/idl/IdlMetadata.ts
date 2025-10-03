import {
  jsonDecoderObject,
  jsonDecoderOptional,
  jsonDecodeValue,
  jsonExpectString,
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
    name: jsonDecoderOptional(jsonExpectString),
    docs: jsonDecoderOptional(jsonDecodeValue),
    description: jsonDecoderOptional(jsonExpectString),
    address: jsonDecoderOptional(jsonExpectString),
    version: jsonDecoderOptional(jsonExpectString),
    spec: jsonDecoderOptional(jsonExpectString),
  }),
);
