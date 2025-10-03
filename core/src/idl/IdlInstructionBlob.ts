import {
  jsonAsArray,
  jsonAsString,
  jsonDecoderByKind,
  jsonDecoderObject,
  jsonDecoderOptional,
  jsonDecodeValue,
  jsonExpectString,
  JsonValue,
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
import { idlTypeFullSerialize } from "./IdlTypeFullSerialize";
import { idlUtilsFlattenBlobs } from "./IdlUtils";

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
  typedefsIdls: Map<string, IdlTypedef>,
): IdlInstructionBlob {
  const info = infoJsonDecode(instructionBlobValue);
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

const infoJsonDecode = jsonDecoderByKind<{
  kind: string | undefined;
  path: string | undefined;
  value: JsonValue;
  type: IdlTypeFlat | undefined;
}>({
  object: jsonDecoderObject({
    kind: jsonDecoderOptional(jsonExpectString),
    path: jsonDecoderOptional(jsonExpectString),
    type: jsonDecoderOptional(idlTypeFlatParse),
    value: jsonDecodeValue,
  }),
  string: (string: string) => ({
    kind: undefined,
    path: undefined,
    type: undefined,
    value: string,
  }),
  array: (array: JsonValue[]) => ({
    kind: undefined,
    path: undefined,
    type: undefined,
    value: array,
  }),
});

export function idlInstructionBlobParseConst(
  instructionBlobValue: JsonValue,
  instructionBlobType: IdlTypeFlat | undefined,
  typedefsIdls: Map<string, IdlTypedef>,
): IdlInstructionBlob {
  if (instructionBlobType === undefined) {
    if (jsonAsString(instructionBlobValue) !== undefined) {
      instructionBlobType = idlTypeFlatParse("string");
    } else if (jsonAsArray(instructionBlobValue) !== undefined) {
      instructionBlobType = idlTypeFlatParse("bytes");
    } else {
      throw new Error(`Idl: Missing type for instruction blob const`);
    }
  }
  const typeFull = idlTypeFlatHydrate(
    instructionBlobType,
    new Map(),
    typedefsIdls,
  );
  const blobs = new Array<Uint8Array>();
  idlTypeFullSerialize(typeFull, instructionBlobValue, blobs, false);
  return IdlInstructionBlob.const({
    bytes: idlUtilsFlattenBlobs(blobs),
  });
}

export function idlInstructionBlobParseArg(
  instructionBlobPath: string,
  instructionBlobType: IdlTypeFlat | undefined,
  instructionArgsTypeFullFields: IdlTypeFullFields,
  typedefsIdls: Map<string, IdlTypedef>,
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
  typedefsIdls: Map<string, IdlTypedef>,
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

export type IdlInstructionBlobComputeContext = {
  instructionProgramAddress: Pubkey;
  instructionPayload: JsonValue;
  instructionAddresses: Map<string, Pubkey>;
  instructionAccountsStates: Map<string, JsonValue>;
  instructionAccountsContentsTypeFull: Map<string, IdlTypeFull>;
};

export function idlInstructionBlobCompute(
  instructionBlob: IdlInstructionBlob,
  context: IdlInstructionBlobComputeContext,
): Uint8Array {
  return instructionBlob.traverse(computeVisitor, context, undefined);
}

const computeVisitor = {
  const: (
    self: IdlInstructionBlobConst,
    _context: IdlInstructionBlobComputeContext,
  ) => {
    return self.bytes;
  },
  arg: (
    self: IdlInstructionBlobArg,
    context: IdlInstructionBlobComputeContext,
  ) => {
    const value = idlPathGetJsonValue(self.path, context.instructionPayload);
    const blobs = new Array<Uint8Array>();
    idlTypeFullSerialize(self.typeFull, value, blobs, false);
    return idlUtilsFlattenBlobs(blobs);
  },
  account: (
    self: IdlInstructionBlobAccount,
    context: IdlInstructionBlobComputeContext,
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
    const instructionAccountContentPath = split.rest;
    if (instructionAccountContentPath.isEmpty()) {
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
    const instructionAccountContentState =
      context.instructionAccountsStates.get(instructionAccountName);
    if (instructionAccountContentState === undefined) {
      throw new Error(
        `Could not find state for account: ${instructionAccountName}`,
      );
    }
    const value = idlPathGetJsonValue(
      instructionAccountContentPath,
      instructionAccountContentState,
    );
    const blobs = new Array<Uint8Array>();
    if (self.typeFull !== undefined) {
      idlTypeFullSerialize(self.typeFull, value, blobs, false);
      return idlUtilsFlattenBlobs(blobs);
    }
    const instructionAccountContentTypeFull =
      context.instructionAccountsContentsTypeFull.get(instructionAccountName);
    if (instructionAccountContentTypeFull === undefined) {
      throw new Error(
        `Could not find content type for account: ${instructionAccountName}`,
      );
    }
    const typeFull = idlPathGetTypeFull(
      instructionAccountContentPath,
      instructionAccountContentTypeFull,
    );
    idlTypeFullSerialize(typeFull, value, blobs, false);
    return idlUtilsFlattenBlobs(blobs);
  },
};
