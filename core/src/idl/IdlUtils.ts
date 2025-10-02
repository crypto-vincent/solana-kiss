import { base16Decode } from "../data/Base16";
import { base58Decode } from "../data/Base58";
import { base64Decode } from "../data/Base64";
import {
  JsonArray,
  jsonDecodeNumber,
  jsonDecoderByKind,
  jsonDecodeString,
  JsonObject,
  jsonPreview,
} from "../data/Json";
import { sha256Hash } from "../data/Sha256";
import { idlTypeFlatParse } from "./IdlTypeFlatDecode";
import { idlTypeFlatHydrate } from "./IdlTypeFlatHydrate";
import { idlTypeFullSerialize } from "./IdlTypeFullSerialize";

export const idlUtilsBytesDecode = jsonDecoderByKind({
  string: (string: string) => {
    return new TextEncoder().encode(string);
  },
  array: (array: JsonArray) => {
    return new Uint8Array(array.map((item) => jsonDecodeNumber(item)));
  },
  object: (object: JsonObject) => {
    // TODO - this looks like an enum - could we use jsonTypeEnum here?
    const base16 = object["base16"];
    if (base16 !== undefined) {
      return base16Decode(jsonDecodeString(base16));
    }
    const base58 = object["base58"];
    if (base58 !== undefined) {
      return base58Decode(jsonDecodeString(base58));
    }
    const base64 = object["base64"];
    if (base64 !== undefined) {
      return base64Decode(jsonDecodeString(base64));
    }
    const utf8 = object["utf8"];
    if (utf8 !== undefined) {
      return new TextEncoder().encode(jsonDecodeString(utf8));
    }
    const type = object["type"];
    if (type !== undefined) {
      const typeFlat = idlTypeFlatParse(type);
      const typeFull = idlTypeFlatHydrate(typeFlat, new Map(), new Map());
      const blobs = new Array<Uint8Array>();
      idlTypeFullSerialize(
        typeFull,
        object["value"],
        blobs,
        object["prefixed"] === true,
      );
      return idlUtilsFlattenBlobs(blobs);
    }
    throw new Error(`Idl: Unknown bytes object: ${jsonPreview(object)}`);
  },
});

export function idlUtilsExpectBlobAt(
  offset: number,
  blobNeedle: Uint8Array,
  blobHaystack: Uint8Array,
): void {
  const start = offset;
  const end = start + blobNeedle.length;
  if (end > blobHaystack.length) {
    throw new Error(
      `Idl: Expected bytes length of at least ${end} (found: ${blobHaystack.length})`,
    );
  }
  for (let index = 0; index < blobNeedle.length; index++) {
    const byteNeedle = blobNeedle[index]!;
    const byteHaystack = blobHaystack[start + index]!;
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
