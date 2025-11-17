import {
  casingLosslessConvertToCamel,
  casingLosslessConvertToSnake,
} from "../data/Casing";
import {
  JsonArray,
  JsonPointer,
  JsonValue,
  jsonCodecString,
  jsonCodecValue,
  jsonDecoderByType,
  jsonDecoderObject,
  jsonDecoderOptional,
  jsonGetAt,
  jsonPointerParse,
} from "../data/Json";
import { Pubkey, pubkeyToBytes } from "../data/Pubkey";
import { IdlInstructionAccountFindContext } from "./IdlInstructionAccount";
import { IdlTypedef } from "./IdlTypedef";
import { IdlTypeFlat } from "./IdlTypeFlat";
import { idlTypeFlatHydrate } from "./IdlTypeFlatHydrate";
import { idlTypeFlatParse } from "./IdlTypeFlatParse";
import { IdlTypeFull, IdlTypeFullFields } from "./IdlTypeFull";
import { idlTypeFullEncode } from "./IdlTypeFullEncode";
import { idlTypeFullFieldsGetAt, idlTypeFullGetAt } from "./IdlTypeFullGetAt";
import { IdlTypePrimitive } from "./IdlTypePrimitive";
import { idlUtilsInferValueTypeFlat } from "./IdlUtils";

export type IdlInstructionBlobAccountsContext = {
  [instructionAccountName: string]: IdlInstructionBlobAccountContent;
};
export type IdlInstructionBlobAccountFetcher = (
  accountAddress: Pubkey,
) => Promise<IdlInstructionBlobAccountContent>;

export type IdlInstructionBlobAccountContent = {
  accountState: JsonValue;
  accountTypeFull: IdlTypeFull | undefined;
};

export type IdlInstructionBlobConst = {
  bytes: Uint8Array;
};
export type IdlInstructionBlobArg = {
  pointer: JsonPointer;
  typeFull: IdlTypeFull;
};
export type IdlInstructionBlobAccount = {
  paths: Array<string>;
  typeFull: IdlTypeFull | undefined;
};

type IdlInstructionBlobDiscriminant = "const" | "arg" | "account";
type IdlInstructionBlobContent =
  | IdlInstructionBlobConst
  | IdlInstructionBlobArg
  | IdlInstructionBlobAccount;

export class IdlInstructionBlob {
  private discriminant: IdlInstructionBlobDiscriminant;
  private content: IdlInstructionBlobContent;

  private constructor(
    discriminant: IdlInstructionBlobDiscriminant,
    content: IdlInstructionBlobContent,
  ) {
    this.discriminant = discriminant;
    this.content = content;
  }

  public static const(value: IdlInstructionBlobConst): IdlInstructionBlob {
    return new IdlInstructionBlob("const", value);
  }
  public static arg(value: IdlInstructionBlobArg): IdlInstructionBlob {
    return new IdlInstructionBlob("arg", value);
  }
  public static account(value: IdlInstructionBlobAccount): IdlInstructionBlob {
    return new IdlInstructionBlob("account", value);
  }

  public traverse<P1, P2, P3, T>(
    visitor: {
      const: (value: IdlInstructionBlobConst, p1: P1, p2: P2, p3: P3) => T;
      arg: (value: IdlInstructionBlobArg, p1: P1, p2: P2, p3: P3) => T;
      account: (value: IdlInstructionBlobAccount, p1: P1, p2: P2, p3: P3) => T;
    },
    p1: P1,
    p2: P2,
    p3: P3,
  ): T {
    return visitor[this.discriminant](this.content as any, p1, p2, p3);
  }
}

export async function idlInstructionBlobCompute(
  self: IdlInstructionBlob,
  findContext: IdlInstructionAccountFindContext,
) {
  return self.traverse(computeVisitor, findContext, undefined, undefined);
}

export function idlInstructionBlobParse(
  instructionBlobValue: JsonValue,
  instructionArgsTypeFullFields: IdlTypeFullFields,
  typedefsIdls?: Map<string, IdlTypedef>,
): IdlInstructionBlob {
  const decoded = jsonDecoder(instructionBlobValue);
  if (decoded.value !== undefined) {
    return idlInstructionBlobParseConst(
      decoded.value,
      decoded.type,
      typedefsIdls,
    );
  }
  if (decoded.path === undefined) {
    throw new Error(`Idl: Expected path/value for instruction blob`);
  }
  if (decoded.kind === "arg") {
    return idlInstructionBlobParseArg(
      decoded.path,
      decoded.type,
      instructionArgsTypeFullFields,
      typedefsIdls,
    );
  }
  if (decoded.kind === undefined || decoded.kind === "account") {
    return idlInstructionBlobParseAccount(
      decoded.path,
      decoded.type,
      typedefsIdls,
    );
  }
  throw new Error(`Idl: Invalid instruction blob kind: ${decoded.kind}`);
}

export function idlInstructionBlobParseConst(
  instructionBlobValue: JsonValue,
  instructionBlobType: IdlTypeFlat | undefined,
  typedefsIdls?: Map<string, IdlTypedef>,
): IdlInstructionBlob {
  const typeFull = idlTypeFlatHydrate(
    instructionBlobType ?? idlUtilsInferValueTypeFlat(instructionBlobValue),
    new Map(),
    typedefsIdls,
  );
  const bytes = idlTypeFullEncode(typeFull, instructionBlobValue, false);
  return IdlInstructionBlob.const({ bytes });
}

export function idlInstructionBlobParseArg(
  instructionBlobPath: string,
  instructionBlobType: IdlTypeFlat | undefined,
  instructionArgsTypeFullFields: IdlTypeFullFields,
  typedefsIdls?: Map<string, IdlTypedef>,
): IdlInstructionBlob {
  const pointer = jsonPointerParse(instructionBlobPath);
  const typeFull = instructionBlobType
    ? idlTypeFlatHydrate(instructionBlobType, new Map(), typedefsIdls)
    : idlTypeFullFieldsGetAt(instructionArgsTypeFullFields, pointer);
  return IdlInstructionBlob.arg({ pointer, typeFull });
}

export function idlInstructionBlobParseAccount(
  instructionBlobPath: string,
  instructionBlobType: IdlTypeFlat | undefined,
  typedefsIdls?: Map<string, IdlTypedef>,
): IdlInstructionBlob {
  const pathCamel = casingLosslessConvertToCamel(instructionBlobPath);
  const pathSnake = casingLosslessConvertToSnake(instructionBlobPath);
  const paths = [instructionBlobPath, pathCamel, pathSnake];
  let typeFull = undefined;
  if (instructionBlobType !== undefined) {
    typeFull = idlTypeFlatHydrate(instructionBlobType, new Map(), typedefsIdls);
  }
  return IdlInstructionBlob.account({ paths, typeFull });
}

const jsonDecoder = jsonDecoderByType<{
  value: JsonValue | undefined;
  type: IdlTypeFlat | undefined;
  kind: string | undefined;
  path: string | undefined;
}>({
  object: jsonDecoderObject({
    value: jsonDecoderOptional(jsonCodecValue.decoder),
    type: jsonDecoderOptional(idlTypeFlatParse),
    kind: jsonDecoderOptional(jsonCodecString.decoder),
    path: jsonDecoderOptional(jsonCodecString.decoder),
  }),
  string: (string: string) => ({
    value: string,
    type: undefined,
    kind: undefined,
    path: undefined,
  }),
  array: (array: JsonArray) => ({
    value: array,
    type: undefined,
    kind: undefined,
    path: undefined,
  }),
});

const computeVisitor = {
  const: async (self: IdlInstructionBlobConst) => {
    return self.bytes;
  },
  arg: async (
    self: IdlInstructionBlobArg,
    findContext: IdlInstructionAccountFindContext,
  ) => {
    const value =
      jsonGetAt(findContext.instructionPayload, self.pointer, {
        throwOnMissing: true,
      }) ?? null;
    return idlTypeFullEncode(self.typeFull, value, false);
  },
  account: async (
    self: IdlInstructionBlobAccount,
    findContext: IdlInstructionAccountFindContext,
  ) => {
    if (
      self.typeFull === undefined ||
      self.typeFull.isPrimitive(IdlTypePrimitive.pubkey)
    ) {
      if (findContext.instructionAddresses !== undefined) {
        for (const [accountField, instructionAddress] of Object.entries(
          findContext.instructionAddresses,
        )) {
          for (const path of self.paths) {
            if (path === accountField) {
              return pubkeyToBytes(instructionAddress);
            }
          }
        }
      }
    }
    if (findContext.accountsContext) {
      for (const [accountField, accountContent] of Object.entries(
        findContext.accountsContext,
      )) {
        for (const path of self.paths) {
          if (path.startsWith(accountField)) {
            return encodeExtractedAccountState(
              path,
              self.typeFull,
              accountField,
              accountContent,
            );
          }
        }
      }
    }
    if (findContext.accountFetcher && findContext.instructionAddresses) {
      for (const [accountField, instructionAddress] of Object.entries(
        findContext.instructionAddresses,
      )) {
        for (const path of self.paths) {
          if (path.startsWith(accountField)) {
            return encodeExtractedAccountState(
              path,
              self.typeFull,
              accountField,
              await findContext.accountFetcher(instructionAddress),
            );
          }
        }
      }
    }
    throw new Error(
      `Idl: Could not resolve matching account content for path: ${self.paths[0]}`,
    );
  },
};

function encodeExtractedAccountState(
  path: string,
  typeFull: IdlTypeFull | undefined,
  accountField: string,
  accountContent: IdlInstructionBlobAccountContent,
) {
  const statePath = path.slice(accountField.length);
  const statePointer = jsonPointerParse(statePath);
  const stateValue =
    jsonGetAt(accountContent.accountState, statePointer, {
      throwOnMissing: true,
    }) ?? null;
  if (typeFull !== undefined) {
    return idlTypeFullEncode(typeFull, stateValue, false);
  }
  if (accountContent.accountTypeFull === undefined) {
    throw new Error(
      `Idl: Cannot compute account blob at path: ${statePath} with just the state and no type information`,
    );
  }
  return idlTypeFullEncode(
    idlTypeFullGetAt(accountContent.accountTypeFull, statePointer),
    stateValue,
    false,
  );
}
