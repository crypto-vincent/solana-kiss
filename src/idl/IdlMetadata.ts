import {
  JsonValue,
  jsonCodecPubkey,
  jsonCodecString,
  jsonDecoderAllOf,
  jsonDecoderObject,
  jsonDecoderObjectKey,
  jsonDecoderOptional,
} from "../data/Json";
import { Pubkey } from "../data/Pubkey";
import { IdlDocs, idlDocsParse } from "./IdlDocs";

export type IdlMetadata = {
  name: string | undefined;
  description: string | undefined;
  repository: string | undefined;
  contact: string | undefined;
  address: Pubkey | undefined;
  version: string | undefined;
  spec: string | undefined;
  docs: IdlDocs;
};

export function idlMetadataParse(value: JsonValue): IdlMetadata {
  const [keyed, root] = outerJsonDecoder(value);
  return {
    name: keyed?.name ?? root?.name,
    description: keyed?.description ?? root?.description,
    repository: keyed?.repository ?? root?.repository,
    contact: keyed?.contact ?? root?.contact,
    address: keyed?.address ?? root?.address,
    version: keyed?.version ?? root?.version,
    spec: keyed?.spec ?? root?.spec,
    docs: keyed?.docs ?? root?.docs,
  };
}

const innerJsonDecoder = jsonDecoderOptional(
  jsonDecoderObject({
    name: jsonDecoderOptional(jsonCodecString.decoder),
    description: jsonDecoderOptional(jsonCodecString.decoder),
    repository: jsonDecoderOptional(jsonCodecString.decoder),
    contact: jsonDecoderOptional(jsonCodecString.decoder),
    address: jsonDecoderOptional(jsonCodecPubkey.decoder),
    version: jsonDecoderOptional(jsonCodecString.decoder),
    spec: jsonDecoderOptional(jsonCodecString.decoder),
    docs: idlDocsParse,
  }),
);

const outerJsonDecoder = jsonDecoderAllOf(
  jsonDecoderOptional(jsonDecoderObjectKey("metadata", innerJsonDecoder)),
  innerJsonDecoder,
);
