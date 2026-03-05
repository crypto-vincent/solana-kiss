import {
  JsonValue,
  jsonCodecPubkey,
  jsonCodecString,
  jsonCodecUrl,
  jsonDecoderInParallel,
  jsonDecoderNullable,
  jsonDecoderObjectToObject,
} from "../data/Json";
import { Pubkey } from "../data/Pubkey";
import { IdlDocs, idlDocsParse } from "./IdlDocs";

/**
 * Represents parsed IDL metadata for a Solana program, aggregating fields
 * from both top-level IDL properties and a nested `metadata` object.
 */
export type IdlMetadata = {
  name: string | undefined;
  spec: string | undefined;
  description: string | undefined;
  repository: string | undefined;
  contact: string | undefined;
  version: string | undefined;
  address: Pubkey | undefined;
  source: URL | undefined;
  docs: IdlDocs;
};

/**
 * Parses program metadata from a raw IDL JSON value.
 * Fields are resolved by checking a nested `metadata` key first, then the root object.
 * @param value - The raw JSON value (typically the top-level IDL object).
 * @returns The parsed {@link IdlMetadata}.
 */
export function idlMetadataParse(value: JsonValue): IdlMetadata {
  const { keyed, root } = outerJsonDecoder(value);
  const metadata = keyed?.metadata;
  return {
    name: metadata?.name ?? root?.name ?? undefined,
    spec: metadata?.spec ?? root?.spec ?? undefined,
    description: metadata?.description ?? root?.description ?? undefined,
    repository: metadata?.repository ?? root?.repository ?? undefined,
    contact: metadata?.contact ?? root?.contact ?? undefined,
    version: metadata?.version ?? root?.version ?? undefined,
    address: metadata?.address ?? root?.address ?? undefined,
    source: metadata?.source ?? root?.source ?? undefined,
    docs: metadata?.docs ?? root?.docs ?? undefined,
  };
}

const innerJsonDecoder = jsonDecoderNullable(
  jsonDecoderObjectToObject({
    name: jsonDecoderNullable(jsonCodecString.decoder),
    spec: jsonDecoderNullable(jsonCodecString.decoder),
    description: jsonDecoderNullable(jsonCodecString.decoder),
    repository: jsonDecoderNullable(jsonCodecString.decoder),
    contact: jsonDecoderNullable(jsonCodecString.decoder),
    version: jsonDecoderNullable(jsonCodecString.decoder),
    address: jsonDecoderNullable(jsonCodecPubkey.decoder),
    source: jsonDecoderNullable(jsonCodecUrl.decoder),
    docs: idlDocsParse,
  }),
);

const outerJsonDecoder = jsonDecoderInParallel({
  keyed: jsonDecoderNullable(
    jsonDecoderObjectToObject({ metadata: innerJsonDecoder }),
  ),
  root: innerJsonDecoder,
});
