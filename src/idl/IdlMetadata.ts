import {
  JsonValue,
  jsonCodecPubkey,
  jsonCodecString,
  jsonDecoderObject,
  jsonDecoderOptional,
} from "../data/Json";
import { Pubkey } from "../data/Pubkey";
import { IdlDocs, idlDocsParse } from "./IdlDocs";

export type IdlMetadata = {
  name: string | undefined;
  description: string | undefined;
  address: Pubkey | undefined;
  version: string | undefined;
  spec: string | undefined;
  docs: IdlDocs;
};

export function idlMetadataParse(value: JsonValue): IdlMetadata {
  return (
    jsonDecoder(value) ?? {
      name: undefined,
      description: undefined,
      address: undefined,
      version: undefined,
      spec: undefined,
      docs: undefined,
    }
  );
}

const jsonDecoder = jsonDecoderOptional(
  jsonDecoderObject({
    name: jsonDecoderOptional(jsonCodecString.decoder),
    description: jsonDecoderOptional(jsonCodecString.decoder),
    address: jsonDecoderOptional(jsonCodecPubkey.decoder),
    version: jsonDecoderOptional(jsonCodecString.decoder),
    spec: jsonDecoderOptional(jsonCodecString.decoder),
    docs: idlDocsParse,
  }),
);
