import { base16Decode } from "../data/base16";
import { base58Decode } from "../data/base58";
import { base64Decode } from "../data/base64";
import {
  JsonArray,
  jsonExpectNumber,
  jsonExpectString,
  JsonObject,
  jsonPreview,
  JsonType,
  jsonTypeArray,
  jsonTypeByKind,
  jsonTypeNumber,
  jsonTypeObject,
  jsonTypeOptional,
  jsonTypeValue,
  JsonValue,
} from "../data/json";
import { IdlTypedef } from "./idlTypedef";
import { idlTypeFlatParse } from "./IdlTypeFlat.parse";

export type IdlAccount = {
  readonly name: string;
  readonly docs: JsonValue;
  readonly space: number | undefined;
  readonly blobs: ReadonlyArray<{ offset: number; value: Uint8Array }>;
  readonly discriminator: Uint8Array;
  //readonly contentTypeFlat: ToolboxIdlTypeFlat;
  //readonly contentTypeFull: ToolboxIdlTypeFull;
};

/*
  public encode(accountState: any): Uint8Array {
    const data: Array<Uint8Array> = [];
    data.push(this.discriminator);
    serialize(this.contentTypeFull, accountState, data, true);
    return Uint8Array.concat(data);
  }

  public decode(accountData: Uint8Array): any {
    this.check(accountData);
    const [, accountState] = deserialize(
      this.contentTypeFull,
      accountData,
      this.discriminator.length,
    );
    return accountState;
  }

  public check(accountData: Uint8Array) {
    if (this.space !== undefined) {
      if (accountData.length !== this.space) {
        throw new Error(
          `Invalid account data length ${accountData.length} for account space ${this.space}`,
        );
      }
    }
    for (const blob of this.blobs) {
      if (
        blob.offset < 0 ||
        blob.offset + blob.value.length > accountData.length
      ) {
        throw new Error(
          `Invalid blob offset ${blob.offset} with length ${blob.value.length} in account data of length ${accountData.length}`,
        );
      }
      for (let index = 0; index < blob.value.length; index++) {
        if (accountData[blob.offset + index] !== blob.value[index]) {
          throw new Error(
            `Invalid blob value at offset ${blob.offset + index} in account data`,
          );
        }
      }
    }
    if (accountData.length < this.discriminator.length) {
      throw new Error(
        `Invalid account data length ${accountData.length} for discriminator length ${this.discriminator.length}`,
      );
    }
    for (let index = 0; index < this.discriminator.length; index++) {
      if (accountData[index] !== this.discriminator[index]) {
        throw new Error(
          `Invalid discriminator at index ${index} in account data`,
        );
      }
    }
  }
}
*/

export const idlAccountUnknown = {
  name: "Unknown",
  docs: undefined,
  space: undefined,
  blobs: [],
  discriminator: new Uint8Array(),
  //contentTypeFlat: ToolboxIdlTypeFlat.structNothing(),
  //contentTypeFull: ToolboxIdlTypeFull.structNothing(),
};

export function idlAccountParse(
  accountName: string,
  accountJson: JsonValue,
  idlTypedefs: Map<string, IdlTypedef>,
): IdlAccount {
  const accountInfo = idlAccountJsonType.decode(accountJson);

  /*
  const contentTypeFlat = parseObjectIsPossible(idlAccount)
    ? parse(idlAccount)
    : parse(accountName);
  const contentTypeFull = hydrate(contentTypeFlat, new Map(), idlTypedefs);
  */
  return {
    name: accountName,
    docs: accountInfo.docs,
    space: accountInfo.space,
    blobs: accountInfo.blobs ?? [],
    discriminator: accountInfo.discriminator ?? new Uint8Array(), // TODO - default sha256
    // ToolboxUtils.discriminator(`account:${accountName}`),
    /*
    contentTypeFlat,
    contentTypeFull,
    */
  };
}

// TODO - relocate this to another spot
export const idlBytesJsonType: JsonType<Uint8Array> = jsonTypeByKind(
  {
    string: (string: string) => {
      return new TextEncoder().encode(string);
    },
    array: (array: JsonArray) => {
      return new Uint8Array(array.map((item) => jsonExpectNumber(item)));
    },
    object: (object: JsonObject) => {
      const base16 = object["base16"];
      if (base16 !== undefined) {
        return base16Decode(jsonExpectString(base16));
      }
      const base58 = object["base58"];
      if (base58 !== undefined) {
        return base58Decode(jsonExpectString(base58));
      }
      const base64 = object["base64"];
      if (base64 !== undefined) {
        return base64Decode(jsonExpectString(base64));
      }
      const utf8 = object["utf8"];
      if (utf8 !== undefined) {
        return new TextEncoder().encode(jsonExpectString(utf8));
      }
      const type = object["type"];
      if (type !== undefined) {
        const typeFlat = idlTypeFlatParse(type);
        // TODO - finish this
        throw new Error("TMP - Idl: Cannot parse type/value bytes yet");
      }
      throw new Error(`Idl: Unknown bytes object: ${jsonPreview(object)}`);
    },
  },
  (bytes: Uint8Array) => Array.from(bytes),
);

const idlAccountJsonType = jsonTypeObject({
  docs: jsonTypeValue(),
  space: jsonTypeOptional(jsonTypeNumber()),
  blobs: jsonTypeOptional(
    jsonTypeArray(
      jsonTypeObject({
        offset: jsonTypeNumber(),
        value: idlBytesJsonType,
      }),
    ),
  ),
  discriminator: jsonTypeOptional(idlBytesJsonType),
});
