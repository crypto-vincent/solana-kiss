import {
  jsonAsArray,
  jsonAsString,
  jsonCodecBoolean,
  jsonCodecBytesArray,
  jsonCodecBytesBase16,
  jsonCodecBytesBase58,
  jsonCodecBytesBase64,
  jsonCodecBytesUtf8,
  jsonCodecNumber,
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

export const idlUtilsBytesJsonDecoder = jsonDecoderByType({
  array: jsonCodecBytesArray.decoder,
  object: jsonDecoderOneOfKeys({
    utf8: jsonCodecBytesUtf8.decoder,
    base16: jsonCodecBytesBase16.decoder,
    base58: jsonCodecBytesBase58.decoder,
    base64: jsonCodecBytesBase64.decoder,
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
        const typeFull = idlTypeFlatHydrate(typeFlat, new Map());
        return idlTypeFullEncode(typeFull, info.value, info.prefixed === true);
      },
    ),
  }),
});

export function idlUtilsInferValueTypeFlat(value: JsonValue): IdlTypeFlat {
  if (jsonAsString(value) !== undefined) {
    return idlTypeFlatParse("string");
  } else if (jsonAsArray(value) !== undefined) {
    return idlTypeFlatParse("bytes");
  } else {
    throw new Error(
      `Idl: Unable to infer type of bytes value: ${jsonPreview(value)}`,
    );
  }
}

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

export function idlUtilsAnchorDiscriminator(name: string): Uint8Array {
  return sha256Hash([utf8Encode(name)]).slice(0, 8);
}
