import {
  jsonExpectObject,
  jsonTypeArray,
  jsonTypeNumber,
  jsonTypeObject,
  jsonTypeOptional,
  jsonTypeValue,
  JsonValue,
} from "../data/Json";
import { Immutable } from "../data/Utils";
import { IdlTypedef } from "./IdlTypedef";
import { IdlTypeFlat } from "./IdlTypeFlat";
import {
  idlTypeFlatParseObject,
  idlTypeFlatParseObjectIsPossible,
} from "./IdlTypeFlatDecode";
import { idlTypeFlatHydrate } from "./IdlTypeFlatHydrate";
import { IdlTypeFull } from "./IdlTypeFull";
import { idlTypeFullDeserialize } from "./IdlTypeFullDeserialize";
import { idlTypeFullSerialize } from "./IdlTypeFullSerialize";
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
  blobs: Array<{ offset: number; value: Uint8Array }>;
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
    idlUtilsExpectBlobAt(blob.offset, blob.value, accountData);
  }
  idlUtilsExpectBlobAt(0, accountIdl.discriminator, accountData);
}

export function idlAccountParse(
  accountName: string,
  accountValue: JsonValue,
  typedefsIdls: Map<string, IdlTypedef>,
): IdlAccount {
  const accountPartial = partialJsonType.decode(accountValue);
  const accountObject = jsonExpectObject(accountValue);
  const contentTypeFlat = idlTypeFlatParseObjectIsPossible(accountObject)
    ? idlTypeFlatParseObject(accountObject)
    : idlTypeFlatDefinedDecode(accountName);
  const contentTypeFull = idlTypeFlatHydrate(
    contentTypeFlat,
    new Map(),
    typedefsIdls,
  );
  return {
    name: accountName,
    docs: accountPartial.docs,
    space: accountPartial.space,
    blobs: accountPartial.blobs ?? [],
    discriminator:
      accountPartial.discriminator ??
      idlUtilsDiscriminator(`account:${accountName}`),
    contentTypeFlat,
    contentTypeFull,
  };
}

const partialJsonType = jsonTypeObject({
  docs: jsonTypeValue(),
  space: jsonTypeOptional(jsonTypeNumber()),
  blobs: jsonTypeOptional(
    jsonTypeArray(
      jsonTypeObject({
        offset: jsonTypeNumber(),
        value: idlUtilsBytesJsonType,
      }),
    ),
  ),
  discriminator: jsonTypeOptional(idlUtilsBytesJsonType),
});
