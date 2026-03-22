import {
  casingLosslessConvertToCamel,
  casingLosslessConvertToSnake,
} from "../data/Casing";
import { ErrorStack, withErrorContext } from "../data/Error";
import {
  JsonPointer,
  JsonValue,
  jsonCodecString,
  jsonDecoderByType,
  jsonDecoderNullable,
  jsonDecoderObjectToObject,
  jsonGetAt,
  jsonPointerParse,
  jsonPointerPreview,
  jsonPreview,
} from "../data/Json";
import { Pubkey, pubkeyToBytes } from "../data/Pubkey";
import { IdlInstructionAccountFindContext } from "./IdlInstructionAccount";
import { IdlTypedef } from "./IdlTypedef";
import { IdlTypeFull, IdlTypeFullFields } from "./IdlTypeFull";
import { idlTypeFullEncode } from "./IdlTypeFullEncode";
import { idlTypeFullFieldsGetAt, idlTypeFullGetAt } from "./IdlTypeFullGetAt";
import { IdlTypePrimitive } from "./IdlTypePrimitive";
import {
  idlUtilsBlobTypeValueParse,
  idlUtilsBlobValueGuessType,
} from "./IdlUtils";

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
  /** The decoded account state as a JSON-compatible value. */
  accountState: JsonValue;
  /** The fully-resolved IDL type of the account, or `undefined` if not available. */
  accountTypeFull: IdlTypeFull | undefined;
};

/** A blob variant that holds a pre-encoded constant byte array. */
export type IdlInstructionBlobConst = {
  /** The pre-encoded bytes of this constant seed. */
  bytes: Uint8Array;
};
/** A blob variant that references a field in the instruction arguments via a JSON pointer. */
export type IdlInstructionBlobArg = {
  /** A JSON Pointer identifying the argument field within the instruction payload. */
  pointer: JsonPointer;
  /** The fully-resolved type used to encode the argument value into bytes. */
  typeFull: IdlTypeFull;
};
/** A blob variant that references a path into a resolved account's on-chain state. */
export type IdlInstructionBlobAccount = {
  /**
   * One or more candidate path strings (in camelCase, snake_case, and as-is) used to
   * locate the value within a resolved account's state.
   */
  paths: Array<string>;
  /** The fully-resolved type used to encode the extracted state value, or `undefined` if to be inferred. */
  typeFull: IdlTypeFull | undefined;
};

type IdlInstructionBlobDiscriminant = "const" | "arg" | "account";
type IdlInstructionBlobContent =
  | IdlInstructionBlobConst
  | IdlInstructionBlobArg
  | IdlInstructionBlobAccount;

/** Blob value: constant bytes, instruction arg reference, or account state reference. */
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
   * Dispatches to the matching visitor branch.
   * @param visitor - Handler per variant (`const`, `arg`, `account`).
   * @param p1 - Forwarded context.
   * @param p2 - Forwarded context.
   * @returns Visitor result.
   */
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

/**
 * Computes raw bytes for a blob by resolving its variant against the find context.
 * @param self - Blob to compute.
 * @param findContext - Resolution context.
 * @returns Computed bytes.
 */
export async function idlInstructionBlobCompute(
  self: IdlInstructionBlob,
  findContext: IdlInstructionAccountFindContext,
) {
  return self.traverse(computeVisitor, findContext, null);
}

/**
 * Parses a raw IDL blob JSON value into an {@link IdlInstructionBlob}.
 * @param instructionBlobValue - Raw JSON blob value.
 * @param instructionArgsTypeFullFields - Resolved arg fields for arg-path parsing.
 * @param typedefsIdls - Known typedef definitions.
 * @returns Parsed {@link IdlInstructionBlob}.
 */
export function idlInstructionBlobParse(
  instructionBlobValue: JsonValue,
  instructionArgsTypeFullFields: IdlTypeFullFields,
  typedefsIdls: Map<string, IdlTypedef>,
): IdlInstructionBlob {
  const { kind, path } = jsonDecoder(instructionBlobValue);
  const { value, typeFull: baseTypeFull } = idlUtilsBlobTypeValueParse(
    instructionBlobValue,
    typedefsIdls,
  );
  if (path === null) {
    const typeFull = baseTypeFull ?? idlUtilsBlobValueGuessType(value);
    if (typeFull === null) {
      throw new ErrorStack(
        `Idl: Instruction Blob: Unknown const value type`,
        jsonPreview(value),
      );
    }
    return IdlInstructionBlob.const({
      bytes: idlTypeFullEncode(typeFull, value, { blobMode: true }),
    });
  }
  if (kind === "arg") {
    const pointer = jsonPointerParse(path);
    const typeFull =
      baseTypeFull ??
      idlTypeFullFieldsGetAt(instructionArgsTypeFullFields, pointer);
    return IdlInstructionBlob.arg({ pointer, typeFull });
  }
  if (kind === null || kind === "account") {
    const paths = [
      path,
      casingLosslessConvertToCamel(path),
      casingLosslessConvertToSnake(path),
    ];
    const typeFull = baseTypeFull ?? undefined;
    return IdlInstructionBlob.account({ paths, typeFull });
  }
  throw new Error(`Idl: Invalid instruction blob kind: ${kind}`);
}

const computeVisitor = {
  const: async (self: IdlInstructionBlobConst) => {
    return self.bytes;
  },
  arg: async (
    self: IdlInstructionBlobArg,
    findContext: IdlInstructionAccountFindContext,
  ) => {
    const pointerPreview = jsonPointerPreview(self.pointer);
    return withErrorContext(
      `Idl: Instruction Blob: Arg: ${pointerPreview}`,
      () => {
        const instructionPayload = findContext.instructionPayload;
        if (instructionPayload === undefined) {
          throw new Error(`Idl: Arg: ${pointerPreview}: Missing IX payload`);
        }
        const value = jsonGetAt(instructionPayload, self.pointer);
        return idlTypeFullEncode(self.typeFull, value, { blobMode: true });
      },
    );
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
              accountField,
              await findContext.accountFetcher(instructionAddress),
            );
          }
        }
      }
    }
    throw new Error(`Idl: Instruction Blob: Account: failed: ${self.paths[0]}`);
  },
};

function encodeExtractedAccountState(
  path: string,
  typeFull: IdlTypeFull | undefined,
  accountField: string,
  accountContent: IdlInstructionBlobAccountContent,
) {
  return withErrorContext(`Idl: Instruction Blob: Account: ${path}`, () => {
    const statePath = path.slice(accountField.length);
    const statePointer = jsonPointerParse(statePath);
    const stateValue = jsonGetAt(accountContent.accountState, statePointer);
    if (typeFull !== undefined) {
      return idlTypeFullEncode(typeFull, stateValue, { blobMode: true });
    }
    if (accountContent.accountTypeFull === undefined) {
      throw new Error(
        `Idl: Cannot compute account blob at path: ${statePath} with just the state and no type information`,
      );
    }
    typeFull = idlTypeFullGetAt(accountContent.accountTypeFull, statePointer);
    return idlTypeFullEncode(typeFull, stateValue, { blobMode: true });
  });
}

const jsonDecoder = jsonDecoderByType({
  null: () => ({ kind: null, path: null }),
  boolean: () => ({ kind: null, path: null }),
  number: () => ({ kind: null, path: null }),
  string: () => ({ kind: null, path: null }),
  array: () => ({ kind: null, path: null }),
  object: jsonDecoderObjectToObject({
    kind: jsonDecoderNullable(jsonCodecString.decoder),
    path: jsonDecoderNullable(jsonCodecString.decoder),
  }),
});
