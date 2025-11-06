import {
  JsonArray,
  JsonPointer,
  JsonValue,
  jsonCodecRaw,
  jsonCodecString,
  jsonDecoderByKind,
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
  instructionAddresses: Record<string, Pubkey>;
  instructionPayload: JsonValue;
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
  path: string;
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
  return IdlInstructionBlob.const({
    bytes: idlTypeFullEncode(typeFull, instructionBlobValue, false),
  });
}

export function idlInstructionBlobParseArg(
  instructionBlobPath: string,
  instructionBlobType: IdlTypeFlat | undefined,
  instructionArgsTypeFullFields: IdlTypeFullFields,
  typedefsIdls?: Map<string, IdlTypedef>,
): IdlInstructionBlob {
  const pointer = jsonPointerParse(instructionBlobPath);
  if (instructionBlobType === undefined) {
    const typeFull = idlTypeFullFieldsGetAt(
      instructionArgsTypeFullFields,
      pointer,
    );
    return IdlInstructionBlob.arg({ pointer, typeFull });
  }
  const typeFull = idlTypeFlatHydrate(
    instructionBlobType,
    new Map(),
    typedefsIdls,
  );
  return IdlInstructionBlob.arg({ pointer, typeFull });
}

export function idlInstructionBlobParseAccount(
  instructionBlobPath: string,
  instructionBlobType: IdlTypeFlat | undefined,
  typedefsIdls?: Map<string, IdlTypedef>,
): IdlInstructionBlob {
  if (instructionBlobType === undefined) {
    return IdlInstructionBlob.account({
      path: instructionBlobPath,
      typeFull: undefined,
    });
  }
  const typeFull = idlTypeFlatHydrate(
    instructionBlobType,
    new Map(),
    typedefsIdls,
  );
  return IdlInstructionBlob.account({ path: instructionBlobPath, typeFull });
}

const jsonDecoder = jsonDecoderByKind<{
  value: JsonValue;
  type: IdlTypeFlat | undefined;
  kind: string | undefined;
  path: string | undefined;
}>({
  object: jsonDecoderObject({
    value: jsonCodecRaw.decoder,
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
      self.typeFull === undefined ||
      self.typeFull.isPrimitive(IdlTypePrimitive.pubkey)
    ) {
      for (const [
        instructionAccountName,
        instructionAddress, // TODO (naming) - naming stands out here
      ] of Object.entries(instructionContent.instructionAddresses)) {
        if (self.path === instructionAccountName) {
          return pubkeyToBytes(instructionAddress);
        }
      }
    }
    if (accountsContext) {
      for (const [instructionAccountName, accountContent] of Object.entries(
        accountsContext,
      )) {
        if (self.path.startsWith(instructionAccountName)) {
          return encodeExtractedAccountState(
            self,
            instructionAccountName,
            accountContent,
          );
        }
      }
    }
    if (accountFetcher) {
      for (const [instructionAccountName, instructionAddress] of Object.entries(
        instructionContent.instructionAddresses,
      )) {
        if (self.path.startsWith(instructionAccountName)) {
          return encodeExtractedAccountState(
            self,
            instructionAccountName,
            await accountFetcher(instructionAddress),
          );
        }
      }
    }
    throw new Error(
      `Idl: Could not resolve matching account content for path: ${self.path}`,
    );
  },
};

function encodeExtractedAccountState(
  self: IdlInstructionBlobAccount,
  instructionAccountName: string,
  accountContent: IdlInstructionBlobAccountContent,
) {
  const statePath = self.path.slice(instructionAccountName.length);
  const statePointer = jsonPointerParse(statePath);
  const stateValue = jsonGetAt(accountContent.accountState, statePointer, {
    throwOnMissing: true,
  });
  if (self.typeFull !== undefined) {
    return idlTypeFullEncode(self.typeFull, stateValue, false);
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
