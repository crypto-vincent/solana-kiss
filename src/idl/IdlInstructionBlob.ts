import {
  casingLosslessConvertToCamel,
  casingLosslessConvertToSnake,
} from "../data/Casing";
import {
  JsonArray,
  JsonPointer,
  JsonValue,
  jsonCodecBoolean,
  jsonCodecString,
  jsonCodecValue,
  jsonDecoderByType,
  jsonDecoderNullable,
  jsonDecoderObjectToObject,
  jsonGetAt,
  jsonPointerParse,
  jsonPointerPreview,
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

/** A pre-fetched map of account content keyed by instruction account name, used to avoid redundant on-chain fetches. */
export type IdlInstructionBlobAccountsContext = {
  [instructionAccountName: string]: IdlInstructionBlobAccountContent;
};
/** An async function that fetches account state and type information for a given public key address. */
export type IdlInstructionBlobAccountFetcher = (
  accountAddress: Pubkey,
) => Promise<IdlInstructionBlobAccountContent>;

/** The on-chain state and optional full type information for a fetched account. */
export type IdlInstructionBlobAccountContent = {
  accountState: JsonValue;
  accountTypeFull: IdlTypeFull | undefined;
};

/** A blob variant that holds a pre-encoded constant byte array. */
export type IdlInstructionBlobConst = {
  bytes: Uint8Array;
};
/** A blob variant that references a field in the instruction arguments via a JSON pointer. */
export type IdlInstructionBlobArg = {
  pointer: JsonPointer;
  typeFull: IdlTypeFull;
  prefixed: boolean; // TODO - this prefixed stuff would benefit from being baked in the types directly ??
};
/** A blob variant that references a path into a resolved account's on-chain state. */
export type IdlInstructionBlobAccount = {
  paths: Array<string>;
  typeFull: IdlTypeFull | undefined;
  prefixed: boolean;
};

type IdlInstructionBlobDiscriminant = "const" | "arg" | "account";
type IdlInstructionBlobContent =
  | IdlInstructionBlobConst
  | IdlInstructionBlobArg
  | IdlInstructionBlobAccount;

/**
 * A discriminated union representing a blob value that can be a constant byte array,
 * a reference into the instruction arguments, or a reference into an account's state.
 */
export class IdlInstructionBlob {
  private readonly discriminant: IdlInstructionBlobDiscriminant;
  private readonly content: IdlInstructionBlobContent;

  private constructor(
    discriminant: IdlInstructionBlobDiscriminant,
    content: IdlInstructionBlobContent,
  ) {
    this.discriminant = discriminant;
    this.content = content;
  }

  /** Creates a constant bytes blob. */
  public static const(value: IdlInstructionBlobConst): IdlInstructionBlob {
    return new IdlInstructionBlob("const", value);
  }
  /** Creates a blob that references a field in the instruction arguments. */
  public static arg(value: IdlInstructionBlobArg): IdlInstructionBlob {
    return new IdlInstructionBlob("arg", value);
  }
  /** Creates a blob that references a path within a resolved account's on-chain state. */
  public static account(value: IdlInstructionBlobAccount): IdlInstructionBlob {
    return new IdlInstructionBlob("account", value);
  }

  /**
   * Dispatches to the appropriate visitor branch based on the blob's variant,
   * forwarding up to three extra parameters and returning the visitor's result.
   */
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

/** Computes the raw byte representation of a blob by resolving its variant against the given find context. */
export async function idlInstructionBlobCompute(
  self: IdlInstructionBlob,
  findContext: IdlInstructionAccountFindContext,
) {
  return self.traverse(computeVisitor, findContext, undefined, undefined);
}

/** Parses a raw IDL blob JSON value into an {@link IdlInstructionBlob}, resolving constant, arg, or account variants. */
export function idlInstructionBlobParse(
  instructionBlobValue: JsonValue,
  instructionArgsTypeFullFields: IdlTypeFullFields,
  typedefsIdls: Map<string, IdlTypedef>,
): IdlInstructionBlob {
  const decoded = jsonDecoder(instructionBlobValue);
  if (decoded.path === null) {
    if (decoded.value !== null) {
      return parseConst(
        decoded.value,
        decoded.type,
        decoded.prefixed,
        typedefsIdls,
      );
    }
    return parseConst(instructionBlobValue, null, null, typedefsIdls);
  }
  if (decoded.kind === "arg") {
    return parseArg(
      decoded.path,
      decoded.type,
      decoded.prefixed,
      instructionArgsTypeFullFields,
      typedefsIdls,
    );
  }
  if (decoded.kind === null || decoded.kind === "account") {
    return parseAccount(
      decoded.path,
      decoded.type,
      decoded.prefixed,
      typedefsIdls,
    );
  }
  throw new Error(`Idl: Invalid instruction blob kind: ${decoded.kind}`);
}

function parseConst(
  instructionBlobValue: JsonValue,
  instructionBlobType: IdlTypeFlat | null,
  instructionBlobPrefixed: boolean | null,
  typedefsIdls: Map<string, IdlTypedef>,
): IdlInstructionBlob {
  const typeFull = idlTypeFlatHydrate(
    instructionBlobType ?? idlUtilsInferValueTypeFlat(instructionBlobValue),
    new Map(),
    typedefsIdls,
  );
  const bytes = idlTypeFullEncode(
    typeFull,
    instructionBlobValue,
    instructionBlobPrefixed === true,
  );
  return IdlInstructionBlob.const({ bytes });
}

function parseArg(
  instructionBlobPath: string,
  instructionBlobType: IdlTypeFlat | null,
  instructionBlobPrefixed: boolean | null,
  instructionArgsTypeFullFields: IdlTypeFullFields,
  typedefsIdls: Map<string, IdlTypedef>,
): IdlInstructionBlob {
  const pointer = jsonPointerParse(instructionBlobPath);
  const typeFull = instructionBlobType
    ? idlTypeFlatHydrate(instructionBlobType, new Map(), typedefsIdls)
    : idlTypeFullFieldsGetAt(instructionArgsTypeFullFields, pointer);
  return IdlInstructionBlob.arg({
    pointer,
    typeFull,
    prefixed: instructionBlobPrefixed === true,
  });
}

function parseAccount(
  instructionBlobPath: string,
  instructionBlobType: IdlTypeFlat | null,
  instructionBlobPrefixed: boolean | null,
  typedefsIdls: Map<string, IdlTypedef>,
): IdlInstructionBlob {
  const paths = [
    instructionBlobPath,
    casingLosslessConvertToCamel(instructionBlobPath),
    casingLosslessConvertToSnake(instructionBlobPath),
  ];
  let typeFull = undefined;
  if (instructionBlobType !== null) {
    typeFull = idlTypeFlatHydrate(instructionBlobType, new Map(), typedefsIdls);
  }
  return IdlInstructionBlob.account({
    paths,
    typeFull,
    prefixed: instructionBlobPrefixed === true,
  });
}

const jsonDecoder = jsonDecoderByType<{
  value: JsonValue;
  type: IdlTypeFlat | null;
  kind: string | null;
  path: string | null;
  prefixed: boolean | null;
}>({
  object: jsonDecoderObjectToObject({
    value: jsonCodecValue.decoder,
    type: jsonDecoderNullable(idlTypeFlatParse),
    kind: jsonDecoderNullable(jsonCodecString.decoder),
    path: jsonDecoderNullable(jsonCodecString.decoder),
    prefixed: jsonDecoderNullable(jsonCodecBoolean.decoder),
  }),
  string: (string: string) => ({
    value: string,
    type: null,
    kind: null,
    path: null,
    prefixed: null,
  }),
  array: (array: JsonArray) => ({
    value: array,
    type: null,
    kind: null,
    path: null,
    prefixed: null,
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
    const instructionPayload = findContext.instructionPayload;
    if (instructionPayload === undefined) {
      const pointerPreview = jsonPointerPreview(self.pointer);
      throw new Error(
        `Idl: Cannot compute instruction blob arg at path: ${pointerPreview} without instruction payload`,
      );
    }
    const value = jsonGetAt(instructionPayload, self.pointer);
    return idlTypeFullEncode(self.typeFull, value, self.prefixed);
  },
  account: async (
    self: IdlInstructionBlobAccount,
    findContext: IdlInstructionAccountFindContext,
  ) => {
    if (
      self.typeFull === undefined ||
      self.typeFull.isPrimitive(IdlTypePrimitive.pubkey)
    ) {
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
    if (findContext.accountsContext) {
      for (const [accountField, accountContent] of Object.entries(
        findContext.accountsContext,
      )) {
        for (const path of self.paths) {
          if (path.startsWith(accountField)) {
            return encodeExtractedAccountState(
              path,
              self.typeFull,
              self.prefixed,
              accountField,
              accountContent,
            );
          }
        }
      }
    }
    if (findContext.accountFetcher) {
      for (const [accountField, instructionAddress] of Object.entries(
        findContext.instructionAddresses,
      )) {
        for (const path of self.paths) {
          if (path.startsWith(accountField)) {
            return encodeExtractedAccountState(
              path,
              self.typeFull,
              self.prefixed,
              accountField,
              await findContext.accountFetcher(instructionAddress),
            );
          }
        }
      }
    }
    throw new Error(
      `Idl: Could not resolve blob account content for path: ${self.paths[0]}`,
    );
  },
};

function encodeExtractedAccountState(
  path: string,
  typeFull: IdlTypeFull | undefined,
  prefixed: boolean,
  accountField: string,
  accountContent: IdlInstructionBlobAccountContent,
) {
  const statePath = path.slice(accountField.length);
  const statePointer = jsonPointerParse(statePath);
  const stateValue = jsonGetAt(accountContent.accountState, statePointer);
  if (typeFull !== undefined) {
    return idlTypeFullEncode(typeFull, stateValue, prefixed);
  }
  if (accountContent.accountTypeFull === undefined) {
    throw new Error(
      `Idl: Cannot compute account blob at path: ${statePath} with just the state and no type information`,
    );
  }
  return idlTypeFullEncode(
    idlTypeFullGetAt(accountContent.accountTypeFull, statePointer),
    stateValue,
    prefixed,
  );
}
