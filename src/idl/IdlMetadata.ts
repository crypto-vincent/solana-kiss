import {
  JsonValue,
  jsonCodecPubkey,
  jsonCodecString,
  jsonDecoderInParallel,
  jsonDecoderNullable,
  jsonDecoderObjectToObject,
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
  source: string | undefined;
  spec: string | undefined;
  docs: IdlDocs;
};

/** Parses IDL metadata (name, address, version, etc.) from JSON. */

export function idlMetadataParse(value: JsonValue): IdlMetadata {
  const { keyed, root } = outerJsonDecoder(value);
  const metadata = keyed?.metadata;
  return {
    name: metadata?.name ?? root?.name ?? undefined,
    description: metadata?.description ?? root?.description ?? undefined,
    repository: metadata?.repository ?? root?.repository ?? undefined,
    contact: metadata?.contact ?? root?.contact ?? undefined,
    address: metadata?.address ?? root?.address ?? undefined,
    version: metadata?.version ?? root?.version ?? undefined,
    source: metadata?.source ?? root?.source ?? undefined,
    spec: metadata?.spec ?? root?.spec ?? undefined,
    docs: metadata?.docs ?? root?.docs ?? undefined,
  };
}

const innerJsonDecoder = jsonDecoderNullable(
  jsonDecoderObjectToObject({
    name: jsonDecoderNullable(jsonCodecString.decoder),
    description: jsonDecoderNullable(jsonCodecString.decoder),
    repository: jsonDecoderNullable(jsonCodecString.decoder),
    contact: jsonDecoderNullable(jsonCodecString.decoder),
    address: jsonDecoderNullable(jsonCodecPubkey.decoder),
    version: jsonDecoderNullable(jsonCodecString.decoder),
    source: jsonDecoderNullable(jsonCodecString.decoder),
    spec: jsonDecoderNullable(jsonCodecString.decoder),
    docs: idlDocsParse,
  }),
);

const outerJsonDecoder = jsonDecoderInParallel({
  keyed: jsonDecoderNullable(
    jsonDecoderObjectToObject({ metadata: innerJsonDecoder }),
  ),
  root: innerJsonDecoder,
});
