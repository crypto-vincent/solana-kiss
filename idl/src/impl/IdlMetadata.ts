import {
  jsonDecoderObject,
  jsonDecoderOptional,
  jsonTypeString,
  jsonTypeValue,
  JsonValue,
  Pubkey,
} from "solana-kiss-data";

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
    infoJsonDecoder(value) ?? {
      name: undefined,
      docs: undefined,
      description: undefined,
      address: undefined,
      version: undefined,
      spec: undefined,
    }
  );
}

const infoJsonDecoder = jsonDecoderOptional(
  jsonDecoderObject({
    name: jsonDecoderOptional(jsonTypeString.decoder),
    docs: jsonDecoderOptional(jsonTypeValue.decoder),
    description: jsonDecoderOptional(jsonTypeString.decoder),
    address: jsonDecoderOptional(jsonTypeString.decoder),
    version: jsonDecoderOptional(jsonTypeString.decoder),
    spec: jsonDecoderOptional(jsonTypeString.decoder),
  }),
);
