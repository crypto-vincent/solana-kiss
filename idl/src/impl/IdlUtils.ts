import {
  base16Decode,
  base58Decode,
  base64Decode,
  JsonArray,
  jsonAsArray,
  jsonAsString,
  jsonDecoderByKind,
  jsonDecoderObject,
  jsonDecoderOptional,
  jsonDecoderRemap,
  jsonPreview,
  jsonTypeBoolean,
  jsonTypeNumber,
  jsonTypeString,
  jsonTypeValue,
  JsonValue,
  sha256Hash,
} from "solana-kiss-data";
import { IdlTypeFlat } from "./IdlTypeFlat";
import { idlTypeFlatHydrate } from "./IdlTypeFlatHydrate";
import { idlTypeFlatParse } from "./IdlTypeFlatParse";
import { idlTypeFullSerialize } from "./IdlTypeFullSerialize";

export const idlUtilsIntegerJsonDecode = jsonDecoderByKind({
  number: (number: number) => BigInt(number),
  string: (string: string) => BigInt(string),
});

export const idlUtilsFloatingJsonDecode = jsonDecoderByKind({
  number: (number: number) => number,
  string: (string: string) => Number(string),
});

export const idlUtilsBytesJsonDecode = jsonDecoderByKind({
  string: (string: string) => {
    return new TextEncoder().encode(string);
  },
  array: (array: JsonArray) => {
    return new Uint8Array(array.map(jsonTypeNumber.decode));
  },
  object: jsonDecoderRemap(
    jsonDecoderObject({
      base16: jsonDecoderOptional(jsonTypeString.decode),
      base58: jsonDecoderOptional(jsonTypeString.decode),
      base64: jsonDecoderOptional(jsonTypeString.decode),
      value: jsonTypeValue.decode,
      type: jsonDecoderOptional(idlTypeFlatParse),
      prefixed: jsonDecoderOptional(jsonTypeBoolean.decode),
    }),
    (info) => {
      if (info.base16 !== undefined) {
        return base16Decode(info.base16);
      }
      if (info.base58 !== undefined) {
        return base58Decode(info.base58);
      }
      if (info.base64 !== undefined) {
        return base64Decode(info.base64);
      }
      const typeFlat = info.type ?? idlUtilsInferValueTypeFlat(info.value);
      const typeFull = idlTypeFlatHydrate(typeFlat, new Map(), new Map());
      const blobs = new Array<Uint8Array>();
      idlTypeFullSerialize(typeFull, info.value, blobs, info.prefixed === true);
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
