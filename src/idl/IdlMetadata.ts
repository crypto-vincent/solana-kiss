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
  /** Human-readable program name (e.g. `"my_program"`), or `undefined` if not specified. */
  name: string | undefined;
  /** IDL specification version string (e.g. `"0.1.0"`), or `undefined` if not specified. */
  spec: string | undefined;
  /** Human-readable description of the program, or `undefined` if not specified. */
  description: string | undefined;
  /** URL to the program's source repository, or `undefined` if not specified. */
  repository: string | undefined;
  /** Contact information for the program maintainers, or `undefined` if not specified. */
  contact: string | undefined;
  /** Semantic version of the deployed program (e.g. `"1.2.3"`), or `undefined` if not specified. */
  version: string | undefined;
  /** The on-chain address of the program, or `undefined` if not available. */
  address: Pubkey | undefined;
  /** The URL from which this IDL was loaded (e.g. `onchain://…` or an HTTP URL), or `undefined`. */
  source: URL | undefined;
  /** Human-readable documentation strings for the program, or `undefined` if not specified. */
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
