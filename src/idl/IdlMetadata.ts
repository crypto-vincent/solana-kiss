import {
  JsonValue,
  jsonCodecPubkey,
  jsonCodecString,
  jsonDecoderMultiplexed,
  jsonDecoderNullable,
  jsonDecoderObject,
  jsonDecoderObjectKey,
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

export function idlMetadataParse(value: JsonValue): IdlMetadata {
  const { keyed, root } = outerJsonDecoder(value);
  return {
    name: keyed?.name ?? root?.name ?? undefined,
    description: keyed?.description ?? root?.description ?? undefined,
    repository: keyed?.repository ?? root?.repository ?? undefined,
    contact: keyed?.contact ?? root?.contact ?? undefined,
    address: keyed?.address ?? root?.address ?? undefined,
    version: keyed?.version ?? root?.version ?? undefined,
    source: keyed?.source ?? root?.source ?? undefined,
    spec: keyed?.spec ?? root?.spec ?? undefined,
    docs: keyed?.docs ?? root?.docs ?? undefined,
  };
}

const innerJsonDecoder = jsonDecoderNullable(
  jsonDecoderObject({
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

const outerJsonDecoder = jsonDecoderMultiplexed({
  keyed: jsonDecoderNullable(
    jsonDecoderObjectKey("metadata", innerJsonDecoder),
  ),
  root: innerJsonDecoder,
});
