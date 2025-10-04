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
    name: jsonDecoderOptional(jsonTypeString.decode),
    docs: jsonDecoderOptional(jsonTypeValue.decode),
    description: jsonDecoderOptional(jsonTypeString.decode),
    address: jsonDecoderOptional(jsonTypeString.decode),
    version: jsonDecoderOptional(jsonTypeString.decode),
    spec: jsonDecoderOptional(jsonTypeString.decode),
  }),
);
