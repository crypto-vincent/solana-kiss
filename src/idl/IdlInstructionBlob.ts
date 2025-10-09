import {
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
  pointer: JsonPointer;
  typeFull: IdlTypeFull;
};
export type IdlInstructionBlobAccount = {
  name: string;
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
  const path = jsonPointerParse(instructionBlobPath);
  if (instructionBlobType === undefined) {
    const typeFull = idlTypeFullFieldsGetAt(
      instructionArgsTypeFullFields,
      path,
    );
    return IdlInstructionBlob.arg({ pointer: path, typeFull });
  }
  const typeFull = idlTypeFlatHydrate(
    instructionBlobType,
    new Map(),
    typedefsIdls,
  );
  return IdlInstructionBlob.arg({ pointer: path, typeFull });
}

export function idlInstructionBlobParseAccount(
  instructionBlobPath: string,
  instructionBlobType: IdlTypeFlat | undefined,
  typedefsIdls?: Map<string, IdlTypedef>,
): IdlInstructionBlob {
  const nameAndPointer = jsonPointerParse(instructionBlobPath);
  const name = nameAndPointer[0];
  if (name === undefined) {
    throw new Error(
      "PDA Blob account path is empty (should have at least the account name)",
    );
  }
  if (typeof name !== "string" || name === "") {
    throw new Error(
      "PDA Blob account path first part should be an account name",
    );
  }
  const pointer = nameAndPointer.slice(1);
  if (instructionBlobType === undefined) {
    return IdlInstructionBlob.account({ name, pointer, typeFull: undefined });
  }
  const typeFull = idlTypeFlatHydrate(
    instructionBlobType,
    new Map(),
    typedefsIdls,
  );
  return IdlInstructionBlob.account({ name, pointer, typeFull });
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
  array: (array: JsonValue[]) => ({
    value: array,
    type: undefined,
    kind: undefined,
    path: undefined,
  }),
});

const computeVisitor = {
  const: (self: IdlInstructionBlobConst) => {
    return self.bytes;
  },
  arg: (self: IdlInstructionBlobArg, context: IdlInstructionBlobContext) => {
    const value = jsonGetAt(context.instructionPayload, self.pointer, {
      throwOnMissing: true,
    });
    const blobs = new Array<Uint8Array>();
    idlTypeFullEncode(self.typeFull, value, blobs, false);
    return idlUtilsFlattenBlobs(blobs);
  },
  account: (
    self: IdlInstructionBlobAccount,
    context: IdlInstructionBlobContext,
  ) => {
    if (self.pointer.length === 0) {
      const instructionAddress = context.instructionAddresses.get(self.name);
      if (instructionAddress === undefined) {
        throw new Error(`Could not find address for account: ${self.name}`);
      }
      return pubkeyToBytes(instructionAddress);
    }
    const instructionAccountState = context.instructionAccountsStates?.get(
      self.name,
    );
    if (instructionAccountState === undefined) {
      throw new Error(`Could not find state for account: ${self.name}`);
    }
    const value = jsonGetAt(instructionAccountState, self.pointer, {
      throwOnMissing: true,
    });
    const blobs = new Array<Uint8Array>();
    if (self.typeFull !== undefined) {
      idlTypeFullEncode(self.typeFull, value, blobs, false);
      return idlUtilsFlattenBlobs(blobs);
    }
    const instructionAccountContentTypeFull =
      context.instructionAccountsContentsTypeFull?.get(self.name);
    if (instructionAccountContentTypeFull === undefined) {
      throw new Error(`Could not find content type for account: ${self.name}`);
    }
    const typeFull = idlTypeFullGetAt(
      instructionAccountContentTypeFull,
      self.pointer,
    );
    idlTypeFullEncode(typeFull, value, blobs, false);
    return idlUtilsFlattenBlobs(blobs);
  },
};
