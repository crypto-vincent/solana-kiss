import {
  jsonDecodeNumber,
  jsonDecoderArray,
  jsonDecoderObject,
  jsonDecoderOptional,
  jsonDecodeValue,
  JsonValue,
} from "../data/Json";
import { Immutable } from "../data/Utils";
import { IdlTypedef } from "./IdlTypedef";
import { IdlTypeFlat } from "./IdlTypeFlat";
import { idlTypeFlatHydrate } from "./IdlTypeFlatHydrate";
import {
  idlTypeFlatParse,
  idlTypeFlatParseIsPossible,
} from "./IdlTypeFlatParse";
import { IdlTypeFull } from "./IdlTypeFull";
import { idlTypeFullDeserialize } from "./IdlTypeFullDeserialize";
import { idlTypeFullSerialize } from "./IdlTypeFullSerialize";
import {
  idlUtilsBytesJsonDecode,
  idlUtilsDiscriminator,
  idlUtilsExpectBlobAt,
  idlUtilsFlattenBlobs,
} from "./IdlUtils";

export type IdlAccount = {
  name: string;
  docs: JsonValue;
  space: number | undefined;
  blobs: Array<{ offset: number; bytes: Uint8Array }>;
  discriminator: Uint8Array;
  contentTypeFlat: IdlTypeFlat;
  contentTypeFull: IdlTypeFull;
};

export const idlAccountUnknown: Immutable<IdlAccount> = {
  name: "Unknown",
  docs: undefined,
  space: undefined,
  blobs: [],
  discriminator: new Uint8Array(),
  contentTypeFlat: IdlTypeFlat.structNothing(),
  contentTypeFull: IdlTypeFull.structNothing(),
};

export function idlAccountEncode(
  accountIdl: IdlAccount,
  accountState: JsonValue,
): Uint8Array {
  const blobs = new Array<Uint8Array>();
  blobs.push(accountIdl.discriminator);
  idlTypeFullSerialize(accountIdl.contentTypeFull, accountState, blobs, true);
  return idlUtilsFlattenBlobs(blobs);
}

export function idlAccountDecode(
  accountIdl: IdlAccount,
  accountData: Uint8Array,
): JsonValue {
  idlAccountCheck(accountIdl, accountData);
  const [, accountState] = idlTypeFullDeserialize(
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
  typedefsIdls: Map<string, IdlTypedef>,
): IdlAccount {
  const info = infoJsonDecode(accountValue);
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
    docs: info.docs,
    space: info.space,
    blobs: info.blobs ?? [],
    discriminator:
      info.discriminator ?? idlUtilsDiscriminator(`account:${accountName}`),
    contentTypeFlat,
    contentTypeFull,
  };
}

const infoJsonDecode = jsonDecoderObject({
  docs: jsonDecodeValue,
  space: jsonDecoderOptional(jsonDecodeNumber),
  blobs: jsonDecoderOptional(
    jsonDecoderArray(
      jsonDecoderObject({
        offset: jsonDecodeNumber,
        bytes: idlUtilsBytesJsonDecode,
      }),
    ),
  ),
  discriminator: jsonDecoderOptional(idlUtilsBytesJsonDecode),
});
