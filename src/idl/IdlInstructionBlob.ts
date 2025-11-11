import { casingConvertToCamel, casingConvertToSnake } from "../data/Casing";
import {
  JsonArray,
  JsonPointer,
  JsonValue,
  jsonCodecString,
  jsonCodecValue,
  jsonDecoderAnyOfKind,
  jsonDecoderObject,
  jsonDecoderOptional,
  jsonGetAt,
  jsonPointerParse,
} from "../data/Json";
import { Pubkey, pubkeyToBytes } from "../data/Pubkey";
import { IdlTypedef } from "./IdlTypedef";
import { IdlTypeFlat } from "./IdlTypeFlat";
import { idlTypeFlatHydrate } from "./IdlTypeFlatHydrate";
import { idlTypeFlatParse } from "./IdlTypeFlatParse";
import { IdlTypeFull, IdlTypeFullFields } from "./IdlTypeFull";
import { idlTypeFullEncode } from "./IdlTypeFullEncode";
import { idlTypeFullFieldsGetAt, idlTypeFullGetAt } from "./IdlTypeFullGetAt";
import { IdlTypePrimitive } from "./IdlTypePrimitive";
import { idlUtilsInferValueTypeFlat } from "./IdlUtils";

export type IdlInstructionBlobInstructionContent = {
  instructionAddresses?: Record<string, Pubkey>;
  instructionPayload?: JsonValue;
};
export type IdlInstructionBlobAccountContent = {
  accountState: JsonValue;
  accountTypeFull?: IdlTypeFull | undefined;
};
export type IdlInstructionBlobAccountsContext = Record<
  string,
  IdlInstructionBlobAccountContent
>;
export type IdlInstructionBlobAccountFetcher = (
  accountAddress: Pubkey,
) => Promise<IdlInstructionBlobAccountContent>;

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
  instructionContent: IdlInstructionBlobInstructionContent,
  accountsContext?: IdlInstructionBlobAccountsContext,
  accountFetcher?: IdlInstructionBlobAccountFetcher,
) {
  return self.traverse(
    computeVisitor,
    instructionContent,
    accountsContext,
    accountFetcher,
  );
}

export function idlInstructionBlobParse(
  instructionBlobValue: JsonValue,
  instructionArgsTypeFullFields: IdlTypeFullFields,
  typedefsIdls?: Map<string, IdlTypedef>,
): IdlInstructionBlob {
  const decoded = jsonDecoder(instructionBlobValue);
  if (decoded.value !== undefined || decoded.kind === "const") {
    return idlInstructionBlobParseConst(
      decoded.value,
      decoded.type,
      typedefsIdls,
    );
  }
  if (decoded.path === undefined) {
    throw new Error(`Idl: Missing path for instruction blob`);
  }
  if (decoded.kind === "arg") {
    // TODO - can we auto-detect arg mode ?
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
  instructionBlobValue: JsonValue | undefined,
  instructionBlobType: IdlTypeFlat | undefined,
  typedefsIdls?: Map<string, IdlTypedef>,
): IdlInstructionBlob {
  if (instructionBlobValue === undefined) {
    throw new Error(`Idl: Missing value for const instruction blob`);
  }
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
  const pathCamel = casingConvertToCamel(instructionBlobPath);
  const pathSnake = casingConvertToSnake(instructionBlobPath);
  const paths = [instructionBlobPath, pathCamel, pathSnake];
  let typeFull = undefined;
  if (instructionBlobType !== undefined) {
    typeFull = idlTypeFlatHydrate(instructionBlobType, new Map(), typedefsIdls);
  }
  return IdlInstructionBlob.account({ paths, typeFull });
}

const jsonDecoder = jsonDecoderAnyOfKind<{
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
    instructionContent: IdlInstructionBlobInstructionContent,
  ) => {
    const value = jsonGetAt(
      instructionContent.instructionPayload,
      self.pointer,
      { throwOnMissing: true },
    );
    return idlTypeFullEncode(self.typeFull, value, false);
  },
  account: async (
    self: IdlInstructionBlobAccount,
    instructionContent: IdlInstructionBlobInstructionContent,
    accountsContext?: IdlInstructionBlobAccountsContext,
    accountFetcher?: IdlInstructionBlobAccountFetcher,
  ) => {
    if (
      instructionContent.instructionAddresses &&
      (self.typeFull === undefined ||
        self.typeFull.isPrimitive(IdlTypePrimitive.pubkey))
    ) {
      for (const [
        instructionAccountName,
        instructionAddress, // TODO (naming) - naming stands out here
      ] of Object.entries(instructionContent.instructionAddresses)) {
        for (const path of self.paths) {
          if (path === instructionAccountName) {
            return pubkeyToBytes(instructionAddress);
          }
        }
      }
    }
    if (accountsContext) {
      for (const [instructionAccountName, accountContent] of Object.entries(
        accountsContext,
      )) {
        for (const path of self.paths) {
          if (path.startsWith(instructionAccountName)) {
            return encodeExtractedAccountState(
              path,
              self.typeFull,
              instructionAccountName,
              accountContent,
            );
          }
        }
      }
    }
    if (accountFetcher && instructionContent.instructionAddresses) {
      for (const [instructionAccountName, instructionAddress] of Object.entries(
        instructionContent.instructionAddresses,
      )) {
        for (const path of self.paths) {
          if (path.startsWith(instructionAccountName)) {
            return encodeExtractedAccountState(
              path,
              self.typeFull,
              instructionAccountName,
              await accountFetcher(instructionAddress),
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
  instructionAccountName: string,
  accountContent: IdlInstructionBlobAccountContent,
) {
  const statePath = path.slice(instructionAccountName.length);
  const statePointer = jsonPointerParse(statePath);
  const stateValue = jsonGetAt(accountContent.accountState, statePointer, {
    throwOnMissing: true,
  });
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
