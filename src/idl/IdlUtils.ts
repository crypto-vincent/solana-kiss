import {
  jsonCodecArrayToBytes,
  jsonCodecBase16ToBytes,
  jsonCodecBase58ToBytes,
  jsonCodecBase64ToBytes,
  jsonCodecNumber,
  jsonCodecUtf8ToBytes,
  jsonCodecValue,
  JsonDecoder,
  jsonDecoderByType,
  jsonDecoderFirstMatch,
  jsonDecoderNullable,
  jsonDecoderObjectToObject,
  jsonDecoderOneOfKeys,
  jsonDecoderWrapped,
  jsonParse,
  JsonValue,
} from "../data/Json";
import { sha256Hash } from "../data/Sha256";
import { utf8Encode } from "../data/Utf8";
import { IdlTypeFlat } from "./IdlTypeFlat";
import { idlTypeFlatHydrate } from "./IdlTypeFlatHydrate";
import { idlTypeFlatParse } from "./IdlTypeFlatParse";
import { idlTypeFullEncode } from "./IdlTypeFullEncode";

/**
 * Computes the 8-byte Anchor discriminator (first 8 bytes of SHA-256(name)).
 * @param name - Account or instruction name (e.g. `"account:MyAccount"`).
 * @returns 8-byte discriminator.
 */
export function idlUtilsAnchorDiscriminator(name: string): Uint8Array {
  return sha256Hash([utf8Encode(name)]).slice(0, 8);
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
      `Expected bytes length of at least ${end} (found: ${data.length})`,
    );
  }
  for (let index = 0; index < blobBytes.length; index++) {
    const byteNeedle = blobBytes[index]!;
    const byteHaystack = data[start + index]!;
    if (byteNeedle !== byteHaystack) {
      throw new Error(
        `Expected byte at index ${index} to be: ${byteNeedle} (found: ${byteHaystack})`,
      );
    }
  }
}

const objectBytesJsonDecoder: JsonDecoder<Uint8Array> = jsonDecoderOneOfKeys({
  blob: jsonDecoderWrapped(idlUtilsBlobTypeValueJsonDecoder, (blob) => {
    if (blob.typeFlat === null) {
      throw new Error(`Idl: Expected type for blob value`);
    }
    const typeFull = idlTypeFlatHydrate(blob.typeFlat, new Map(), null);
    return idlTypeFullEncode(typeFull, blob.value, { blobMode: true });
  }),
  base16: jsonCodecBase16ToBytes.decoder,
  base58: jsonCodecBase58ToBytes.decoder,
  base64: jsonCodecBase64ToBytes.decoder,
  utf8: jsonCodecUtf8ToBytes.decoder,
  fill: jsonDecoderWrapped(
    jsonDecoderObjectToObject({
      length: jsonCodecNumber.decoder,
      byte: jsonCodecNumber.decoder,
    }),
    (object) => new Uint8Array(object.length).fill(object.byte),
  ),
});
const blobBytesJsonDecoder = jsonDecoderByType<{
  typeFlat: IdlTypeFlat;
  value: JsonValue;
}>({
  string: (string) => ({
    typeFlat: idlTypeFlatParse("pubkey"),
    value: string,
  }),
  array: (array) => ({
    typeFlat: idlTypeFlatParse("bytes"),
    value: array,
  }),
  object: jsonDecoderWrapped(objectBytesJsonDecoder, (bytes) => ({
    typeFlat: idlTypeFlatParse("bytes"),
    value: Array.from(bytes),
  })),
});
const blobTypeValueJsonDecoder = jsonDecoderFirstMatch<{
  typeFlat: IdlTypeFlat | null;
  value: JsonValue;
}>([
  blobBytesJsonDecoder,
  jsonDecoderWrapped(
    jsonDecoderObjectToObject({
      type: jsonDecoderNullable(idlTypeFlatParse),
      value: jsonCodecValue.decoder,
    }),
    (object) => {
      if (object.type === null && object.value !== null) {
        return blobBytesJsonDecoder(object.value);
      }
      return {
        typeFlat: object.type,
        value: object.value,
      };
    },
  ),
]);

/**
 * JSON decoder for IDL blob values (used in PDA blobs constants and inputs).
 */
export function idlUtilsBlobTypeValueJsonDecoder(blobValue: JsonValue): {
  typeFlat: IdlTypeFlat | null;
  value: JsonValue;
} {
  return blobTypeValueJsonDecoder(blobValue);
}

/**
 * JSON decoder for byte arrays constants.
 */
export const idlUtilsBytesJsonDecoder = jsonDecoderByType({
  array: jsonCodecArrayToBytes.decoder,
  object: objectBytesJsonDecoder,
});
