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
import { objectGetOwnProperty } from "../data/Utils";
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
  instructionAddresses: Record<string, Pubkey>;
  instructionPayload: JsonValue;
  // TODO - should those two be merged into a single map of account name to (pubkey,state,type) or a snapshot object ?
  instructionAccountsStates?: Record<string, JsonValue>;
  instructionAccountsTypes?: Record<string, IdlTypeFull>;
};

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
    for (const [
      instructionAccountName,
      instructionAddress, // TODO - naming stands out here
    ] of Object.entries(context.instructionAddresses)) {
      if (instructionAccountName === self.path) {
        return pubkeyToBytes(instructionAddress);
      }
    }
    if (context.instructionAccountsStates === undefined) {
      throw new Error(
        `Cannot resolve account blob for account: ${self.path}, missing accounts states`,
      );
    }
    for (const [
      instructionAccountName,
      instructionAccountState,
    ] of Object.entries(context.instructionAccountsStates)) {
      if (self.path.startsWith(instructionAccountName)) {
        const statePath = self.path.slice(instructionAccountName.length);
        const statePointer = jsonPointerParse(statePath);
        const stateValue = jsonGetAt(instructionAccountState, statePointer, {
          throwOnMissing: true,
        });
        const blobs = new Array<Uint8Array>();
        if (self.typeFull !== undefined) {
          idlTypeFullEncode(self.typeFull, stateValue, blobs, false);
          return idlUtilsFlattenBlobs(blobs);
        }
        const stateTypeFull = objectGetOwnProperty(
          context.instructionAccountsTypes,
          instructionAccountName,
        );
        if (stateTypeFull === undefined) {
          throw new Error(
            `Could not find content type for account: ${instructionAccountName}`,
          );
        }
        idlTypeFullEncode(
          idlTypeFullGetAt(stateTypeFull, statePointer),
          stateValue,
          blobs,
          false,
        );
        return idlUtilsFlattenBlobs(blobs);
      }
    }
    throw new Error(`Could not resolve blob value for account: ${self.path}`);
  },
};
