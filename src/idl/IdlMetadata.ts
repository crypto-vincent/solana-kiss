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

/** Parsed IDL metadata for a Solana program. */
export type IdlMetadata = {
  /** Program name (e.g. `"my_program"`), or `undefined`. */
  name: string | undefined;
  /** IDL spec version string (e.g. `"0.1.0"`), or `undefined`. */
  spec: string | undefined;
  /** Program description, or `undefined`. */
  description: string | undefined;
  /** Source repository URL, or `undefined`. */
  repository: string | undefined;
  /** Maintainer contact info, or `undefined`. */
  contact: string | undefined;
  /** Deployed program version (e.g. `"1.2.3"`), or `undefined`. */
  version: string | undefined;
  /** On-chain program address, or `undefined`. */
  address: Pubkey | undefined;
  /** URL from which this IDL was loaded, or `undefined`. */
  source: URL | undefined;
  /** Program documentation strings, or `undefined`. */
  docs: IdlDocs;
};

/**
 * Parses program metadata from a raw IDL JSON value.
 * Checks `metadata` key first, then the root object.
 * @param value - Top-level IDL JSON value.
 * @returns Parsed {@link IdlMetadata}.
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
