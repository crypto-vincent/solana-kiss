import {
  jsonAsArray,
  jsonAsObject,
  jsonAsString,
  jsonCodecArrayToBytes,
  jsonCodecBase16ToBytes,
  jsonCodecBase58ToBytes,
  jsonCodecBase64ToBytes,
  jsonCodecNumber,
  jsonCodecUtf8ToBytes,
  jsonCodecValue,
  jsonDecoderByType,
  jsonDecoderNullable,
  jsonDecoderObjectToObject,
  jsonDecoderOneOfKeys,
  jsonDecoderWrapped,
  jsonParse,
  JsonValue,
} from "../data/Json";
import { sha256Hash } from "../data/Sha256";
import { utf8Encode } from "../data/Utf8";
import { IdlTypedef } from "./IdlTypedef";
import { IdlTypeFlat } from "./IdlTypeFlat";
import { idlTypeFlatHydrate } from "./IdlTypeFlatHydrate";
import { idlTypeFlatParse } from "./IdlTypeFlatParse";
import { IdlTypeFull } from "./IdlTypeFull";
import { idlTypeFullEncode } from "./IdlTypeFullEncode";
import { IdlTypePrimitive } from "./IdlTypePrimitive";

/**
 * JSON decoder for byte arrays. Accepted formats:
 * - JSON array of numbers
 * - Object keys: `utf8`, `base16`, `base58`, `base64`, `zeroes`, `encode`
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
    encoded: jsonDecoderWrapped(
      jsonDecoderObjectToObject({
        type: idlTypeFlatParse,
        value: jsonCodecValue.decoder,
      }),
      (info) => {
        const typeFull = idlTypeFlatHydrate(info.type, new Map(), null);
        return idlTypeFullEncode(typeFull, info.value, { blobMode: true });
      },
    ),
  }),
});

/**
 * Asserts a specific byte sequence is present in `data` at `blobOffset`.
 * @param blobOffset - Start byte offset.
 * @param blobBytes - Expected bytes.
 * @param data - Buffer to verify.
 * @throws If data is too short or bytes don't match.
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
 * Parses a Rust-flavored JSON string (handles `_` digit separators, e.g. `1_000_000`).
 * @param jsonRusted - JSON string with possible Rust numeric literals.
 * @returns Parsed {@link JsonValue}.
 */
export function idlUtilsJsonRustedParse(jsonRusted: string): JsonValue {
  return jsonParse(
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
 * Computes the 8-byte Anchor discriminator (first 8 bytes of SHA-256(name)).
 * @param name - Account or instruction name (e.g. `"account:MyAccount"`).
 * @returns 8-byte discriminator.
 */
export function idlUtilsAnchorDiscriminator(name: string): Uint8Array {
  return sha256Hash([utf8Encode(name)]).slice(0, 8);
}

/**
 * Parses a blob value into a structured format with type information.
 * @param blobValue - JSON value for the blob.
 * @param typedefsIdls - Typedefs for type resolution.
 * @returns Parsed blob info.
 */
export function idlUtilsBlobTypeValueParse(
  blobValue: JsonValue,
  typedefsIdls: Map<string, IdlTypedef>,
) {
  const decoded = blobJsonDecoder(blobValue);
  if (decoded.value === null && decoded.type === null) {
    return { value: blobValue, typeFull: null };
  }
  if (decoded.type === null) {
    return { value: decoded.value, typeFull: null };
  }
  return {
    value: decoded.value,
    typeFull: idlTypeFlatHydrate(decoded.type, new Map(), typedefsIdls),
  };
}

/**
 * Infers the type of a blob value based on its structure.
 * For example, if the value is a JSON array, it infers a vector of bytes.
 *
 * @param blobValue - The JSON value representing the blob's value.
 * @returns The inferred {@link IdlTypeFull} or `null` if the type cannot be inferred.
 */
export function idlUtilsBlobValueGuessType(blobValue: JsonValue) {
  if (jsonAsString(blobValue) !== undefined) {
    return IdlTypeFull.primitive(IdlTypePrimitive.pubkey);
  }
  if (
    jsonAsArray(blobValue) !== undefined ||
    jsonAsObject(blobValue) !== undefined
  ) {
    const u8 = IdlTypeFull.primitive(IdlTypePrimitive.u8);
    return IdlTypeFull.vec({ prefix: undefined, items: u8 });
  }
  return null;
}

const blobJsonDecoder = jsonDecoderByType<{
  value: JsonValue;
  type: IdlTypeFlat | null;
}>({
  null: () => ({ value: null, type: null }),
  boolean: (boolean) => ({ value: boolean, type: null }),
  number: (number) => ({ value: number, type: null }),
  string: (string) => ({ value: string, type: null }),
  array: (array) => ({ value: array, type: null }),
  object: jsonDecoderObjectToObject({
    value: jsonCodecValue.decoder,
    type: jsonDecoderNullable(idlTypeFlatParse),
  }),
});
