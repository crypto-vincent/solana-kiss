import {
  JsonValue,
  jsonCodecNumber,
  jsonDecoderArrayToArray,
  jsonDecoderNullable,
  jsonDecoderObjectToObject,
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

/** Parsed IDL account definition with discriminator and type info. */
export type IdlAccount = {
  /** camelCase account name. */
  name: string;
  /** Documentation strings, or `undefined`. */
  docs: IdlDocs;
  /**
   * Discriminator bytes (default: first 8 bytes of SHA-256(`"account:<name>"`)).
   */
  discriminator: Uint8Array;
  /** Expected data byte length, or `undefined` if variable-length. */
  dataSpace: number | undefined;
  /**
   * Expected byte blobs at fixed offsets (e.g. discriminator at offset 0).
   */
  dataBlobs: Array<{ offset: number; bytes: Uint8Array }>;
  /** Unresolved flat type representation. */
  typeFlat: IdlTypeFlat;
  /** Fully-resolved type for encoding and decoding. */
  typeFull: IdlTypeFull;
};

/**
 * Encodes an account state value, prepending the discriminator.
 * @param self - IDL account definition.
 * @param accountState - Value to encode.
 * @returns `{ accountData }`.
 */
export function idlAccountEncode(self: IdlAccount, accountState: JsonValue) {
  return {
    accountData: idlTypeFullEncode(self.typeFull, accountState, {
      discriminator: self.discriminator,
    }),
  };
}

/**
 * Decodes raw account data bytes after validating constraints.
 * @param self - IDL account definition.
 * @param accountData - Raw account data.
 * @returns `{ accountState }`.
 */
export function idlAccountDecode(self: IdlAccount, accountData: Uint8Array) {
  idlAccountCheck(self, accountData);
  const [, accountState] = idlTypeFullDecode(
    self.typeFull,
    new DataView(accountData.buffer),
    self.discriminator.length,
  );
  return { accountState };
}

/**
 * Validates raw account data against expected space and discriminator blobs.
 * @param self - IDL account definition.
 * @param accountData - Raw account data to validate.
 * @throws If validation fails.
 */
export function idlAccountCheck(
  self: IdlAccount,
  accountData: Uint8Array,
): void {
  if (self.dataSpace !== undefined) {
    if (self.dataSpace !== accountData.length) {
      throw new Error(
        `Idl: Expected account space ${self.dataSpace} (found: ${accountData.length})`,
      );
    }
  }
  for (const dataBlob of self.dataBlobs) {
    idlUtilsExpectBlobAt(dataBlob.offset, dataBlob.bytes, accountData);
  }
}

/**
 * Parses an IDL account definition from JSON. Resolves types from `typedefsIdls`.
 * Discriminator defaults to Anchor `account:<name>` hash if not specified.
 * @param accountName - Account name.
 * @param accountValue - Raw JSON value.
 * @param typedefsIdls - Known typedef definitions.
 * @returns Parsed {@link IdlAccount}.
 */
export function idlAccountParse(
  accountName: string,
  accountValue: JsonValue,
  typedefsIdls: Map<string, IdlTypedef>,
): IdlAccount {
  const decoded = jsonDecoder(accountValue);
  const discriminator =
    decoded.discriminator ??
    idlUtilsAnchorDiscriminator(`account:${accountName}`);
  const dataSpace = decoded.space ?? undefined;
  const dataBlobs = new Array<{ offset: number; bytes: Uint8Array }>();
  dataBlobs.push({ offset: 0, bytes: discriminator });
  if (decoded.blobs !== null) {
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

const jsonDecoder = jsonDecoderObjectToObject({
  docs: idlDocsParse,
  space: jsonDecoderNullable(jsonCodecNumber.decoder),
  blobs: jsonDecoderNullable(
    jsonDecoderArrayToArray(
      jsonDecoderObjectToObject({
        offset: jsonCodecNumber.decoder,
        bytes: idlUtilsBytesJsonDecoder,
      }),
    ),
  ),
  discriminator: jsonDecoderNullable(idlUtilsBytesJsonDecoder),
});
