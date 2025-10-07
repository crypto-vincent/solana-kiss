import {
  jsonAsArray,
  jsonAsString,
  jsonDecoderByKind,
  jsonDecoderObject,
  jsonDecoderOptional,
  jsonDecoderTransform,
  jsonPreview,
  jsonTypeBoolean,
  jsonTypeBytesArray,
  jsonTypeBytesBase16,
  jsonTypeBytesBase58,
  jsonTypeBytesBase64,
  jsonTypeBytesUtf8,
  jsonTypeValue,
  JsonValue,
} from "../data/Json";
import { sha256Hash } from "../data/Sha256";
import { utf8Encode } from "../data/Utf8";
import { IdlTypeFlat } from "./IdlTypeFlat";
import { idlTypeFlatHydrate } from "./IdlTypeFlatHydrate";
import { idlTypeFlatParse } from "./IdlTypeFlatParse";
import { idlTypeFullEncode } from "./IdlTypeFullEncode";

export const idlUtilsBytesJsonDecoder = jsonDecoderByKind({
  string: jsonTypeBytesUtf8.decoder,
  array: jsonTypeBytesArray.decoder,
  object: jsonDecoderTransform(
    jsonDecoderObject((key) => key, {
      base16: jsonDecoderOptional(jsonTypeBytesBase16.decoder),
      base58: jsonDecoderOptional(jsonTypeBytesBase58.decoder),
      base64: jsonDecoderOptional(jsonTypeBytesBase64.decoder),
      value: jsonTypeValue.decoder,
      type: jsonDecoderOptional(idlTypeFlatParse),
      prefixed: jsonDecoderOptional(jsonTypeBoolean.decoder),
    }),
    (info) => {
      if (info.base16 !== undefined) {
        return info.base16;
      }
      if (info.base58 !== undefined) {
        return info.base58;
      }
      if (info.base64 !== undefined) {
        return info.base64;
      }
      const typeFlat = info.type ?? idlUtilsInferValueTypeFlat(info.value);
      const typeFull = idlTypeFlatHydrate(typeFlat, new Map());
      const blobs = new Array<Uint8Array>();
      idlTypeFullEncode(typeFull, info.value, blobs, info.prefixed === true);
      return idlUtilsFlattenBlobs(blobs);
    },
  ),
});

export function idlUtilsInferValueTypeFlat(value: JsonValue): IdlTypeFlat {
  if (value === null || value === undefined) {
    return idlTypeFlatParse(null);
  } else if (jsonAsString(value)) {
    return idlTypeFlatParse("string");
  } else if (jsonAsArray(value)) {
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

export function idlUtilsFlattenBlobs(blobs: Array<Uint8Array>): Uint8Array {
  let length = 0;
  for (const blob of blobs) {
    length += blob.length;
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const blob of blobs) {
    bytes.set(blob, offset);
    offset += blob.length;
  }
  return bytes;
}

export function idlUtilsDiscriminator(name: string): Uint8Array {
  return sha256Hash([utf8Encode(name)]).slice(0, 8);
}
