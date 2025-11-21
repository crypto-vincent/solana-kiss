import {
  JsonValue,
  jsonCodecPubkey,
  jsonCodecString,
  jsonDecoderInParallel,
  jsonDecoderNullable,
  jsonDecoderObject,
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
    name: keyed?.metadata?.name ?? root?.name ?? undefined,
    description: keyed?.metadata?.description ?? root?.description ?? undefined,
    repository: keyed?.metadata?.repository ?? root?.repository ?? undefined,
    contact: keyed?.metadata?.contact ?? root?.contact ?? undefined,
    address: keyed?.metadata?.address ?? root?.address ?? undefined,
    version: keyed?.metadata?.version ?? root?.version ?? undefined,
    source: keyed?.metadata?.source ?? root?.source ?? undefined,
    spec: keyed?.metadata?.spec ?? root?.spec ?? undefined,
    docs: keyed?.metadata?.docs ?? root?.docs ?? undefined,
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

const outerJsonDecoder = jsonDecoderInParallel({
  keyed: jsonDecoderNullable(jsonDecoderObject({ metadata: innerJsonDecoder })),
  root: innerJsonDecoder,
});
