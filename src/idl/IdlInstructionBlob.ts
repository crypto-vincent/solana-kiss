import {
  JsonValue,
  jsonDecoderByKind,
  jsonDecoderObject,
  jsonDecoderOptional,
  jsonTypeString,
  jsonTypeValue,
} from "../data/Json";
import { Pubkey, pubkeyToBytes } from "../data/Pubkey";
import {
  IdlPath,
  idlPathGetJsonValue,
  idlPathGetTypeFull,
  idlPathGetTypeFullFields,
  idlPathParse,
} from "./IdlPath";
import { IdlTypedef } from "./IdlTypedef";
import { IdlTypeFlat } from "./IdlTypeFlat";
import { idlTypeFlatHydrate } from "./IdlTypeFlatHydrate";
import { idlTypeFlatParse } from "./IdlTypeFlatParse";
import { IdlTypeFull, IdlTypeFullFields } from "./IdlTypeFull";
import { idlTypeFullEncode } from "./IdlTypeFullEncode";
import { idlUtilsFlattenBlobs, idlUtilsInferValueTypeFlat } from "./IdlUtils";

export type IdlInstructionBlobContext = {
  instructionProgramAddress: Pubkey;
  instructionAddresses: Map<string, Pubkey>;
  instructionPayload: JsonValue;
  instructionAccountsStates?: Map<string, JsonValue>;
  instructionAccountsContentsTypeFull?: Map<string, IdlTypeFull>;
};

export type IdlInstructionBlobConst = {
  bytes: Uint8Array;
};
export type IdlInstructionBlobArg = {
  path: IdlPath;
  typeFull: IdlTypeFull;
};
export type IdlInstructionBlobAccount = {
  path: IdlPath;
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

export function idlInstructionBlobParse(
  instructionBlobValue: JsonValue,
  instructionArgsTypeFullFields: IdlTypeFullFields,
  typedefsIdls?: Map<string, IdlTypedef>,
): IdlInstructionBlob {
  const info = infoJsonDecoder(instructionBlobValue);
  if (info.value !== undefined || info.kind === "const") {
    return idlInstructionBlobParseConst(info.value, info.type, typedefsIdls);
  }
  if (info.path === undefined) {
    throw new Error(`Idl: Missing path for instruction blob`);
  }
  if (info.kind === "arg") {
    return idlInstructionBlobParseArg(
      info.path,
      info.type,
      instructionArgsTypeFullFields,
      typedefsIdls,
    );
  }
  if (info.kind === undefined || info.kind === "account") {
    return idlInstructionBlobParseAccount(info.path, info.type, typedefsIdls);
  }
  throw new Error(`Idl: Invalid instruction blob kind: ${info.kind}`);
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
  const blobs = new Array<Uint8Array>();
  idlTypeFullEncode(typeFull, instructionBlobValue, blobs, false);
  return IdlInstructionBlob.const({
    bytes: idlUtilsFlattenBlobs(blobs),
  });
}

export function idlInstructionBlobParseArg(
  instructionBlobPath: string,
  instructionBlobType: IdlTypeFlat | undefined,
  instructionArgsTypeFullFields: IdlTypeFullFields,
  typedefsIdls?: Map<string, IdlTypedef>,
): IdlInstructionBlob {
  const path = idlPathParse(instructionBlobPath);
  if (instructionBlobType === undefined) {
    const typeFull = idlPathGetTypeFullFields(
      path,
      instructionArgsTypeFullFields,
    );
    return IdlInstructionBlob.arg({ path, typeFull });
  }
  const typeFull = idlTypeFlatHydrate(
    instructionBlobType,
    new Map(),
    typedefsIdls,
  );
  return IdlInstructionBlob.arg({ path, typeFull });
}

export function idlInstructionBlobParseAccount(
  instructionBlobPath: string,
  instructionBlobType: IdlTypeFlat | undefined,
  typedefsIdls?: Map<string, IdlTypedef>,
): IdlInstructionBlob {
  const path = idlPathParse(instructionBlobPath);
  if (instructionBlobType === undefined) {
    return IdlInstructionBlob.account({ path, typeFull: undefined });
  }
  const typeFull = idlTypeFlatHydrate(
    instructionBlobType,
    new Map(),
    typedefsIdls,
  );
  return IdlInstructionBlob.account({ path, typeFull });
}

const infoJsonDecoder = jsonDecoderByKind<{
  value: JsonValue;
  type: IdlTypeFlat | undefined;
  kind: string | undefined;
  path: string | undefined;
}>({
  object: jsonDecoderObject({
    value: jsonTypeValue.decoder,
    type: jsonDecoderOptional(idlTypeFlatParse),
    kind: jsonDecoderOptional(jsonTypeString.decoder),
    path: jsonDecoderOptional(jsonTypeString.decoder),
  }),
  string: (string: string) => ({
    value: string,
    type: undefined,
    kind: undefined,
    path: undefined,
  }),
  array: (array: JsonValue[]) => ({
    value: array,
    type: undefined,
    kind: undefined,
    path: undefined,
  }),
});

export function idlInstructionBlobCompute(
  instructionBlobIdl: IdlInstructionBlob,
  instructionBlobContext: IdlInstructionBlobContext,
): Uint8Array {
  return instructionBlobIdl.traverse(
    computeVisitor,
    instructionBlobContext,
    undefined,
  );
}

const computeVisitor = {
  const: (
    self: IdlInstructionBlobConst,
    _context: IdlInstructionBlobContext,
  ) => {
    return self.bytes;
  },
  arg: (self: IdlInstructionBlobArg, context: IdlInstructionBlobContext) => {
    const value = idlPathGetJsonValue(self.path, context.instructionPayload);
    const blobs = new Array<Uint8Array>();
    idlTypeFullEncode(self.typeFull, value, blobs, false);
    return idlUtilsFlattenBlobs(blobs);
  },
  account: (
    self: IdlInstructionBlobAccount,
    context: IdlInstructionBlobContext,
  ) => {
    if (self.path.isEmpty()) {
      throw new Error(
        "PDA Blob account path is empty (should have at least the account name)",
      );
    }
    const split = self.path.splitFirst();
    if (split === undefined) {
      throw new Error("PDA Blob account path is empty (should not happen)");
    }
    const instructionAccountName = split.first.key();
    if (!instructionAccountName) {
      throw new Error(
        "PDA Blob account path first part should be an account name",
      );
    }
    const contentPath = split.rest;
    if (contentPath.isEmpty()) {
      const instructionAddress = context.instructionAddresses.get(
        instructionAccountName,
      )!;
      if (!instructionAddress) {
        throw new Error(
          `Could not find address for account: ${instructionAccountName}`,
        );
      }
      return pubkeyToBytes(instructionAddress);
    }
    const instructionAccountState = context.instructionAccountsStates?.get(
      instructionAccountName,
    );
    if (instructionAccountState === undefined) {
      throw new Error(
        `Could not find state for account: ${instructionAccountName}`,
      );
    }
    const value = idlPathGetJsonValue(contentPath, instructionAccountState);
    const blobs = new Array<Uint8Array>();
    if (self.typeFull !== undefined) {
      idlTypeFullEncode(self.typeFull, value, blobs, false);
      return idlUtilsFlattenBlobs(blobs);
    }
    const instructionAccountContentTypeFull =
      context.instructionAccountsContentsTypeFull?.get(instructionAccountName);
    if (instructionAccountContentTypeFull === undefined) {
      throw new Error(
        `Could not find content type for account: ${instructionAccountName}`,
      );
    }
    const typeFull = idlPathGetTypeFull(
      contentPath,
      instructionAccountContentTypeFull,
    );
    idlTypeFullEncode(typeFull, value, blobs, false);
    return idlUtilsFlattenBlobs(blobs);
  },
};
