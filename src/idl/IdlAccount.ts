import {
  JsonValue,
  jsonDecoderArray,
  jsonDecoderObject,
  jsonDecoderOptional,
  jsonTypeNumber,
  jsonTypeValue,
} from "../data/Json";
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
  idlUtilsBytesJsonType,
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

// TODO - handle unknown in a better way maybe in a higher level tool/service
export const idlAccountUnknown: IdlAccount = {
  name: "Unknown",
  docs: undefined,
  space: undefined,
  blobs: [],
  discriminator: new Uint8Array(),
  contentTypeFlat: IdlTypeFlat.structNothing(),
  contentTypeFull: IdlTypeFull.structNothing(),
};

// TODO - should this be named differently, or at least take a a jsonDecoder ?
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
  const info = infoJsonDecoder(accountValue);
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

const infoJsonDecoder = jsonDecoderObject((key) => key, {
  docs: jsonTypeValue.decoder,
  space: jsonDecoderOptional(jsonTypeNumber.decoder),
  blobs: jsonDecoderOptional(
    jsonDecoderArray(
      jsonDecoderObject((key) => key, {
        offset: jsonTypeNumber.decoder,
        bytes: idlUtilsBytesJsonType.decoder,
      }),
    ),
  ),
  discriminator: jsonDecoderOptional(idlUtilsBytesJsonType.decoder),
});
