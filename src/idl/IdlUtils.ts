import {
  jsonAsArray,
  jsonAsString,
  jsonDecoderByKind,
  jsonDecoderObject,
  jsonDecoderOptional,
  jsonDecoderRemap,
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
import { IdlTypeFlat } from "./IdlTypeFlat";
import { idlTypeFlatHydrate } from "./IdlTypeFlatHydrate";
import { idlTypeFlatParse } from "./IdlTypeFlatParse";
import { idlTypeFullSerialize } from "./IdlTypeFullSerialize";

export const idlUtilsBytesJsonType = {
  decoder: jsonDecoderByKind({
    string: jsonTypeBytesUtf8.decoder,
    array: jsonTypeBytesArray.decoder,
    object: jsonDecoderRemap(
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
        const typeFull = idlTypeFlatHydrate(typeFlat, new Map(), new Map());
        const blobs = new Array<Uint8Array>();
        idlTypeFullSerialize(
          typeFull,
          info.value,
          blobs,
          info.prefixed === true,
        );
        return idlUtilsFlattenBlobs(blobs);
      },
    ),
  }),
  encoder: (bytes: Uint8Array): JsonValue => {
    return Array.from(bytes);
  },
};

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
  const totalLength = blobs.reduce((sum, arr) => sum + arr.length, 0);
  const bytes = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of blobs) {
    bytes.set(arr, offset);
    offset += arr.length;
  }
  return bytes;
}

export function idlUtilsDiscriminator(name: string): Uint8Array {
  return sha256Hash([new TextEncoder().encode(name)]).slice(0, 8);
}
