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
  jsonIsDeepEqual,
  jsonIsDeepSubset,
  jsonPointerParse,
  jsonPointerPreview,
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
export type IdlInstructionBlobAccountContents = {
  byAccountName?: Record<string, IdlInstructionBlobAccountContent>; // TODO (naming) - i dont like this name
  fetcher?: (
    accountAddress: Pubkey,
  ) => Promise<IdlInstructionBlobAccountContent>;
};

export type IdlInstructionBlobConst = {
  bytes: Uint8Array;
};
export type IdlInstructionBlobArg = {
  pointer: JsonPointer;
  typeFull: IdlTypeFull;
};
export type IdlInstructionBlobAccount = {
  pointer: JsonPointer;
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

  public traverse<P1, P2, T>(
    visitor: {
      const: (value: IdlInstructionBlobConst, p1: P1, p2: P2) => T;
      arg: (value: IdlInstructionBlobArg, p1: P1, p2: P2) => T;
      account: (value: IdlInstructionBlobAccount, p1: P1, p2: P2) => T;
    },
    p1: P1,
    p2: P2,
  ): T {
    return visitor[this.discriminant](this.content as any, p1, p2);
  }
}

export async function idlInstructionBlobCompute(
  instructionBlobIdl: IdlInstructionBlob,
  instructionContent: IdlInstructionBlobInstructionContent,
  accountsContents?: IdlInstructionBlobAccountContents,
) {
  return instructionBlobIdl.traverse(
    computeVisitor,
    instructionContent,
    accountsContents,
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
  const pointer = jsonPointerParse(instructionBlobPath);
  if (instructionBlobType === undefined) {
    return IdlInstructionBlob.account({ pointer, typeFull: undefined });
  }
  const typeFull = idlTypeFlatHydrate(
    instructionBlobType,
    new Map(),
    typedefsIdls,
  );
  return IdlInstructionBlob.account({ pointer, typeFull });
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
    accountsContents?: IdlInstructionBlobAccountContents,
  ) => {
    if (
      self.typeFull === undefined ||
      self.typeFull.isPrimitive(IdlTypePrimitive.pubkey)
    ) {
      for (const [
        instructionAccountName,
        instructionAddress, // TODO (naming) - naming stands out here
      ] of Object.entries(instructionContent.instructionAddresses)) {
        const instructionAccountPointer = jsonPointerParse(
          instructionAccountName,
        );
        if (jsonIsDeepEqual(instructionAccountPointer, self.pointer)) {
          return pubkeyToBytes(instructionAddress);
        }
      }
    }
    const pointerPreview = jsonPointerPreview(self.pointer);
    if (accountsContents === undefined) {
      throw new Error(
        `Idl: Cannot compute account blob at path: ${pointerPreview} without account contents`,
      );
    }
    if (accountsContents.byAccountName !== undefined) {
      for (const [instructionAccountName, accountContent] of Object.entries(
        accountsContents.byAccountName,
      )) {
        const instructionAccountPointer = jsonPointerParse(
          instructionAccountName,
        );
        if (!jsonIsDeepSubset(instructionAccountPointer, self.pointer)) {
          continue;
        }
        const statePointer = self.pointer.slice(
          instructionAccountPointer.length,
        );
        const stateValue = jsonGetAt(
          accountContent.accountState,
          statePointer,
          { throwOnMissing: true },
        );
        if (self.typeFull !== undefined) {
          return idlTypeFullEncode(self.typeFull, stateValue, false);
        }
        if (accountContent.accountTypeFull === undefined) {
          throw new Error(
            `Idl: Cannot compute account blob at path: ${pointerPreview} with just the state and no type information`,
          );
        }
        return idlTypeFullEncode(
          idlTypeFullGetAt(accountContent.accountTypeFull, statePointer),
          stateValue,
          false,
        );
      }
    }
    if (accountsContents.fetcher !== undefined) {
      for (const [instructionAccountName, instructionAddress] of Object.entries(
        instructionContent.instructionAddresses,
      )) {
        const instructionAccountPointer = jsonPointerParse(
          instructionAccountName,
        );
        if (!jsonIsDeepSubset(instructionAccountPointer, self.pointer)) {
          continue;
        }
        const { accountState, accountTypeFull } =
          await accountsContents.fetcher(instructionAddress);
        const statePointer = self.pointer.slice(
          instructionAccountPointer.length,
        );
        const stateValue = jsonGetAt(accountState, statePointer, {
          throwOnMissing: true,
        });
        if (self.typeFull !== undefined) {
          return idlTypeFullEncode(self.typeFull, stateValue, false);
        }
        if (accountTypeFull === undefined) {
          throw new Error(
            `Idl: Could not fetch needed content type for account: ${instructionAccountName}`,
          );
        }
        return idlTypeFullEncode(
          idlTypeFullGetAt(accountTypeFull, statePointer),
          stateValue,
          false,
        );
      }
    }
    throw new Error(
      `Idl: Could not find matching account for path: ${pointerPreview}`,
    );
  },
};
