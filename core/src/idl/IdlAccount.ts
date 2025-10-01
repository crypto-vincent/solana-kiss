import {
  jsonExpectObject,
  jsonTypeArray,
  jsonTypeNumber,
  jsonTypeObject,
  jsonTypeOptional,
  jsonTypeValue,
  JsonValue,
} from "../data/Json";
import { IdlTypedef } from "./IdlTypedef";
import { IdlTypeFlat } from "./IdlTypeFlat";
import { idlTypeFlatHydrate } from "./IdlTypeFlatHydrate";
import {
  idlTypeFlatParseObject,
  idlTypeFlatParseObjectIsPossible,
  idlTypeFlatParseValue,
} from "./IdlTypeFlatParse";
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
  readonly name: string;
  readonly docs: JsonValue;
  readonly space: number | undefined;
  readonly blobs: ReadonlyArray<{ offset: number; value: Uint8Array }>;
  readonly discriminator: Uint8Array;
  readonly contentTypeFlat: IdlTypeFlat;
  readonly contentTypeFull: IdlTypeFull;
};

export const idlAccountUnknown: IdlAccount = {
  name: "Unknown",
  docs: undefined,
  space: undefined,
  blobs: [],
  discriminator: new Uint8Array(),
  contentTypeFlat: IdlTypeFlat.structNothing(),
  contentTypeFull: IdlTypeFull.structNothing(),
};

export function idlAccountParse(
  accountName: string,
  accountValue: JsonValue,
  idlTypedefs: Map<string, IdlTypedef>,
): IdlAccount {
  const accountInfo = infoJsonType.decode(accountValue);
  const accountObject = jsonExpectObject(accountValue);
  const contentTypeFlat = idlTypeFlatParseObjectIsPossible(accountObject)
    ? idlTypeFlatParseObject(accountObject)
    : idlTypeFlatParseValue(accountName);
  const contentTypeFull = idlTypeFlatHydrate(
    contentTypeFlat,
    new Map(),
    idlTypedefs,
  );
  return {
    name: accountName,
    docs: accountInfo.docs,
    space: accountInfo.space,
    blobs: accountInfo.blobs ?? [],
    discriminator:
      accountInfo.discriminator ??
      idlUtilsDiscriminator(`account:${accountName}`),
    contentTypeFlat,
    contentTypeFull,
  };
}

export function idlAccountEncode(
  idlAccount: IdlAccount,
  accountState: JsonValue,
): Uint8Array {
  const blobs = new Array<Uint8Array>();
  blobs.push(idlAccount.discriminator);
  idlTypeFullSerialize(idlAccount.contentTypeFull, accountState, blobs, true);
  return idlUtilsFlattenBlobs(blobs);
}

export function idlAccountDecode(
  idlAccount: IdlAccount,
  accountData: Uint8Array,
): JsonValue {
  idlAccountExpect(idlAccount, accountData);
  const [, accountState] = idlTypeFullDeserialize(
    idlAccount.contentTypeFull,
    new DataView(accountData.buffer),
    idlAccount.discriminator.length,
  );
  return accountState;
}

export function idlAccountExpect(
  idlAccount: IdlAccount,
  accountData: Uint8Array,
): void {
  if (idlAccount.space !== undefined) {
    if (idlAccount.space !== accountData.length) {
      throw new Error(
        `Idl: Expected account space ${idlAccount.space} (found: ${accountData.length})`,
      );
    }
  }
  for (const blob of idlAccount.blobs) {
    idlUtilsExpectBlobAt(blob.offset, blob.value, accountData);
  }
  idlUtilsExpectBlobAt(0, idlAccount.discriminator, accountData);
}

const infoJsonType = jsonTypeObject({
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
