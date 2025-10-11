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
  jsonCodecPubkey,
  jsonCodecRaw,
  jsonCodecString,
  jsonDecoderArray,
  jsonDecoderAsEnum,
  jsonDecoderByKind,
  jsonDecoderObject,
  jsonDecoderOptional,
  jsonDecoderTransform,
  jsonPreview,
  JsonValue,
} from "../data/Json";
import {
  Pubkey,
  pubkeyCreateFromSeed,
  pubkeyFindPdaAddress,
} from "../data/Pubkey";
import { sha256Hash } from "../data/Sha256";
import { utf8Encode } from "../data/Utf8";
import { IdlTypeFlat } from "./IdlTypeFlat";
import { idlTypeFlatHydrate } from "./IdlTypeFlatHydrate";
import { idlTypeFlatParse } from "./IdlTypeFlatParse";
import { idlTypeFullEncode } from "./IdlTypeFullEncode";

export function idlUtilsPubkeyJsonDecoder(encoded: JsonValue): Pubkey {
  return pubkeyJsonDecoder(encoded);
}

export function idlUtilsBytesJsonDecoder(encoded: JsonValue): Uint8Array {
  return bytesJsonDecoder(encoded);
}

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

// TODO - should I add a transformer type thingy to help with this ? (No doesnt make sense because cannot un decoded?)
// TODO - deep test this ?
const pubkeyJsonDecoder = jsonDecoderByKind({
  string: jsonCodecPubkey.decoder,
  object: jsonDecoderAsEnum(
    {
      fromSeed: jsonDecoderTransform(
        jsonDecoderObject({
          from: idlUtilsPubkeyJsonDecoder,
          seed: jsonCodecString.decoder,
          owner: idlUtilsPubkeyJsonDecoder,
        }),
        (info) => pubkeyCreateFromSeed(info.from, info.seed, info.owner),
      ),
      findPda: jsonDecoderTransform(
        jsonDecoderObject({
          program: idlUtilsPubkeyJsonDecoder,
          seeds: jsonDecoderOptional(
            jsonDecoderArray(idlUtilsBytesJsonDecoder),
          ),
        }),
        (info) => pubkeyFindPdaAddress(info.program, info.seeds ?? []),
      ),
    },
    {
      fromSeed: "from_seed",
      findPda: "find_pda",
    },
  ),
});

const bytesJsonDecoder = jsonDecoderByKind({
  array: jsonCodecBytesArray.decoder,
  object: jsonDecoderAsEnum({
    utf8: jsonCodecBytesUtf8.decoder,
    base16: jsonCodecBytesBase16.decoder,
    base58: jsonCodecBytesBase58.decoder,
    base64: jsonCodecBytesBase64.decoder,
    zeroes: jsonDecoderTransform(
      jsonCodecNumber.decoder,
      (n) => new Uint8Array(n),
    ),
    encode: jsonDecoderTransform(
      jsonDecoderObject({
        value: jsonCodecRaw.decoder,
        type: jsonDecoderOptional(idlTypeFlatParse),
        prefixed: jsonDecoderOptional(jsonCodecBoolean.decoder),
      }),
      (info) => {
        const typeFlat = info.type ?? idlUtilsInferValueTypeFlat(info.value);
        const typeFull = idlTypeFlatHydrate(typeFlat, new Map());
        const blobs = new Array<Uint8Array>();
        idlTypeFullEncode(typeFull, info.value, blobs, info.prefixed === true);
        return idlUtilsFlattenBlobs(blobs);
      },
    ),
  }),
});
