import {
  JsonValue,
  jsonCodecNumber,
  jsonDecoderArray,
  jsonDecoderObject,
  jsonDecoderOptional,
} from "../data/Json";
import { IdlDocs, idlDocsParse } from "./IdlDocs";
import { IdlTypedef } from "./IdlTypedef";
import { IdlTypeFlat } from "./IdlTypeFlat";
import { idlTypeFlatHydrate } from "./IdlTypeFlatHydrate";
import {
  idlTypeFlatParse,
  idlTypeFlatParseIsPossible,
} from "./IdlTypeFlatParse";
import { IdlTypeFull } from "./IdlTypeFull";
import { idlTypeFullDecode } from "./IdlTypeFullDecode";
import { idlTypeFullEncode } from "./IdlTypeFullEncode";
import {
  idlUtilsBytesJsonDecoder,
  idlUtilsDiscriminator,
  idlUtilsExpectBlobAt,
  idlUtilsFlattenBlobs,
} from "./IdlUtils";

export type IdlAccount = {
  name: string;
  docs: IdlDocs;
  space: number | undefined;
  blobs: Array<{ offset: number; bytes: Uint8Array }>;
  discriminator: Uint8Array;
  contentTypeFlat: IdlTypeFlat;
  contentTypeFull: IdlTypeFull;
};

export function idlAccountEncode(
  accountIdl: IdlAccount,
  accountState: JsonValue,
): Uint8Array {
  const blobs = new Array<Uint8Array>();
  blobs.push(accountIdl.discriminator);
  idlTypeFullEncode(accountIdl.contentTypeFull, accountState, blobs, true);
  return idlUtilsFlattenBlobs(blobs);
}

export function idlAccountDecode(
  accountIdl: IdlAccount,
  accountData: Uint8Array,
): JsonValue {
  idlAccountCheck(accountIdl, accountData);
  const [, accountState] = idlTypeFullDecode(
    accountIdl.contentTypeFull,
    new DataView(accountData.buffer),
    accountIdl.discriminator.length,
  );
  return accountState;
}

export function idlAccountCheck(
  accountIdl: IdlAccount,
  accountData: Uint8Array,
): void {
  if (accountIdl.space !== undefined) {
    if (accountIdl.space !== accountData.length) {
      throw new Error(
        `Idl: Expected account space ${accountIdl.space} (found: ${accountData.length})`,
      );
    }
  }
  for (const blob of accountIdl.blobs) {
    idlUtilsExpectBlobAt(blob.offset, blob.bytes, accountData);
  }
  idlUtilsExpectBlobAt(0, accountIdl.discriminator, accountData);
}

export function idlAccountParse(
  accountName: string,
  accountValue: JsonValue,
  typedefsIdls?: Map<string, IdlTypedef>,
): IdlAccount {
  const decoded = jsonDecoder(accountValue);
  const contentTypeFlat = idlTypeFlatParseIsPossible(accountValue)
    ? idlTypeFlatParse(accountValue)
    : idlTypeFlatParse(accountName);
  const contentTypeFull = idlTypeFlatHydrate(
    contentTypeFlat,
    new Map(),
    typedefsIdls,
  );
  return {
    name: accountName,
    docs: decoded.docs,
    space: decoded.space,
    blobs: decoded.blobs ?? [],
    discriminator:
      decoded.discriminator ?? idlUtilsDiscriminator(`account:${accountName}`),
    contentTypeFlat,
    contentTypeFull,
  };
}

const jsonDecoder = jsonDecoderObject({
  docs: idlDocsParse,
  space: jsonDecoderOptional(jsonCodecNumber.decoder),
  blobs: jsonDecoderOptional(
    jsonDecoderArray(
      jsonDecoderObject({
        offset: jsonCodecNumber.decoder,
        bytes: idlUtilsBytesJsonDecoder,
      }),
    ),
  ),
  discriminator: jsonDecoderOptional(idlUtilsBytesJsonDecoder),
});
