import {
  jsonAsArray,
  jsonAsObject,
  jsonAsString,
  jsonCodecArrayToBytes,
  jsonCodecBase16ToBytes,
  jsonCodecBase58ToBytes,
  jsonCodecBase64ToBytes,
  jsonCodecBoolean,
  jsonCodecNumber,
  jsonCodecUtf8ToBytes,
  jsonCodecValue,
  jsonDecoderByType,
  jsonDecoderNullable,
  jsonDecoderObjectToObject,
  jsonDecoderOneOfKeys,
  jsonDecoderWrapped,
  jsonPreview,
  JsonValue,
} from "../data/Json";
import { sha256Hash } from "../data/Sha256";
import { utf8Encode } from "../data/Utf8";
import { IdlTypeFlat } from "./IdlTypeFlat";
import { idlTypeFlatHydrate } from "./IdlTypeFlatHydrate";
import { idlTypeFlatParse } from "./IdlTypeFlatParse";
import { idlTypeFullEncode } from "./IdlTypeFullEncode";

/**
 * A JSON decoder that converts various byte-array representations into a
 * `Uint8Array`. Accepted formats:
 * - **array** – plain JSON array of numbers (`[0, 1, 2, …]`)
 * - **object keys**: `utf8`, `base16`, `base58`, `base64` – encoded strings
 * - `zeroes` – allocates an all-zero buffer of the given length
 * - `encode` – encodes an inline IDL value/type pair into bytes
 */
export const idlUtilsBytesJsonDecoder = jsonDecoderByType({
  array: jsonCodecArrayToBytes.decoder,
  object: jsonDecoderOneOfKeys({
    utf8: jsonCodecUtf8ToBytes.decoder,
    base16: jsonCodecBase16ToBytes.decoder,
    base58: jsonCodecBase58ToBytes.decoder,
    base64: jsonCodecBase64ToBytes.decoder,
    zeroes: jsonDecoderWrapped(
      jsonCodecNumber.decoder,
      (n) => new Uint8Array(n),
    ),
    encode: jsonDecoderWrapped(
      jsonDecoderObjectToObject({
        value: jsonCodecValue.decoder,
        type: jsonDecoderNullable(idlTypeFlatParse),
        prefixed: jsonDecoderNullable(jsonCodecBoolean.decoder),
      }),
      (info) => {
        const typeFlat = info.type ?? idlUtilsInferValueTypeFlat(info.value);
        const typeFull = idlTypeFlatHydrate(typeFlat, new Map(), null);
        return idlTypeFullEncode(typeFull, info.value, info.prefixed === true);
      },
    ),
  }),
});

/**
 * Infers a flat IDL type for a JSON value that is expected to represent raw
 * bytes. Strings are treated as public keys (`pubkey`); arrays and objects are
 * treated as byte arrays (`bytes`). Throws for unsupported value shapes.
 *
 * @param value - The JSON value whose flat IDL type should be inferred.
 * @returns The inferred `IdlTypeFlat`.
 */
export function idlUtilsInferValueTypeFlat(value: JsonValue): IdlTypeFlat {
  if (jsonAsString(value) !== undefined) {
    return idlTypeFlatParse("pubkey");
  } else if (jsonAsArray(value) !== undefined) {
    return idlTypeFlatParse("bytes");
  } else if (jsonAsObject(value) !== undefined) {
    return idlTypeFlatParse("bytes");
  } else {
    throw new Error(
      `Idl: Unable to infer type of bytes value: ${jsonPreview(value)}`,
    );
  }
}

/**
 * Asserts that a specific byte sequence (`blobBytes`) is present in `data`
 * starting at `blobOffset`. Throws a descriptive error if the data is too
 * short or any byte does not match.
 *
 * @param blobOffset - The byte offset in `data` at which the expected bytes begin.
 * @param blobBytes - The expected byte sequence.
 * @param data - The buffer to verify against.
 */
export function idlUtilsExpectBlobAt(
  blobOffset: number,
  blobBytes: Uint8Array,
  data: Uint8Array,
): void {
  const start = blobOffset;
  const end = start + blobBytes.length;
  if (end > data.length) {
    throw new Error(
      `Idl: Expected bytes length of at least ${end} (found: ${data.length})`,
    );
  }
  for (let index = 0; index < blobBytes.length; index++) {
    const byteNeedle = blobBytes[index]!;
    const byteHaystack = data[start + index]!;
    if (byteNeedle !== byteHaystack) {
      throw new Error(
        `Idl: Expected byte at index ${index} to be: ${byteNeedle} (found: ${byteHaystack})`,
      );
    }
  }
}

/**
 * Parses a Rust-flavored JSON string into a standard `JsonValue`. Handles
 * Rust-style numeric literals that contain underscores as digit separators
 * (e.g. `1_000_000`), which are not valid in standard JSON.
 *
 * @param jsonRusted - A JSON string potentially containing Rust numeric literals.
 * @returns The parsed `JsonValue`.
 */
export function idlUtilsJsonRustedParse(jsonRusted: string): JsonValue {
  return JSON.parse(
    jsonRusted.replace(
      /"(?:\\.|[^"\\])*"|(-?(?:0|[1-9][0-9_]*)(?:\.[0-9_]+)?(?:[eE][+-]?[0-9_]+)?)/g,
      (match, num) => {
        if (num === undefined) {
          return match;
        }
        return num.replace(/_/g, "");
      },
    ),
  );
}

/**
 * Computes the 8-byte Anchor discriminator for an account or instruction
 * name. The discriminator is the first 8 bytes of the SHA-256 hash of the
 * UTF-8 encoded name string.
 *
 * @param name - The account or instruction name (e.g. `"account:MyAccount"`).
 * @returns An 8-byte `Uint8Array` discriminator.
 */
export function idlUtilsAnchorDiscriminator(name: string): Uint8Array {
  return sha256Hash([utf8Encode(name)]).slice(0, 8);
}
