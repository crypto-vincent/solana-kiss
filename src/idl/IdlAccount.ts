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
  idlUtilsAnchorDiscriminator,
  idlUtilsBytesJsonDecoder,
  idlUtilsExpectBlobAt,
} from "./IdlUtils";

export type IdlAccount = {
  name: string;
  docs: IdlDocs;
  discriminator: Uint8Array;
  dataSpace: number | undefined;
  dataBlobs: Array<{ offset: number; bytes: Uint8Array }>;
  typeFlat: IdlTypeFlat;
  typeFull: IdlTypeFull;
};

export function idlAccountEncode(
  accountIdl: IdlAccount,
  accountState: JsonValue,
): Uint8Array {
  return idlTypeFullEncode(
    accountIdl.typeFull,
    accountState,
    true,
    accountIdl.discriminator,
  );
}

export function idlAccountDecode(
  accountIdl: IdlAccount,
  accountData: Uint8Array,
): JsonValue {
  idlAccountCheck(accountIdl, accountData);
  const [, accountState] = idlTypeFullDecode(
    accountIdl.typeFull,
    new DataView(accountData.buffer),
    accountIdl.discriminator.length,
  );
  return accountState;
}

export function idlAccountCheck(
  accountIdl: IdlAccount,
  accountData: Uint8Array,
): void {
  if (accountIdl.dataSpace !== undefined) {
    if (accountIdl.dataSpace !== accountData.length) {
      throw new Error(
        `Idl: Expected account space ${accountIdl.dataSpace} (found: ${accountData.length})`,
      );
    }
  }
  for (const blob of accountIdl.dataBlobs) {
    idlUtilsExpectBlobAt(blob.offset, blob.bytes, accountData);
  }
}

export function idlAccountParse(
  accountName: string,
  accountValue: JsonValue,
  typedefsIdls?: Map<string, IdlTypedef>,
): IdlAccount {
  const decoded = jsonDecoder(accountValue);
  const discriminator =
    decoded.discriminator ??
    idlUtilsAnchorDiscriminator(`account:${accountName}`);
  const dataSpace = decoded.space;
  const dataBlobs = new Array<{ offset: number; bytes: Uint8Array }>();
  dataBlobs.push({ offset: 0, bytes: discriminator });
  if (decoded.blobs !== undefined) {
    for (const blob of decoded.blobs) {
      if (blob.offset < 0) {
        throw new Error(
          `Idl: Account blob offset must be >= 0 (found: ${blob.offset})`,
        );
      }
      dataBlobs.push(blob);
    }
  }
  const typeFlat = idlTypeFlatParseIsPossible(accountValue)
    ? idlTypeFlatParse(accountValue)
    : idlTypeFlatParse(accountName);
  const typeFull = idlTypeFlatHydrate(typeFlat, new Map(), typedefsIdls);
  return {
    name: accountName,
    docs: decoded.docs,
    discriminator,
    dataSpace,
    dataBlobs,
    typeFlat,
    typeFull,
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
