import { casingLosslessConvertToSnake } from "../data/Casing";
import { ErrorStack, withErrorContext } from "../data/Error";
import { InstructionInput } from "../data/Instruction";
import {
  jsonCodecArray,
  jsonDecoderNullable,
  jsonDecoderObjectToObject,
  JsonValue,
} from "../data/Json";
import { Pubkey } from "../data/Pubkey";
import { objectGetOwnProperty, objectGuessIntendedKey } from "../data/Utils";
import { IdlDocs, idlDocsParse } from "./IdlDocs";
import {
  IdlInstructionAccount,
  idlInstructionAccountFind,
  IdlInstructionAccountFindContext,
  idlInstructionAccountParse,
} from "./IdlInstructionAccount";
import {
  IdlInstructionBlobAccountFetcher,
  IdlInstructionBlobAccountsContext,
} from "./IdlInstructionBlob";
import { IdlTypedef } from "./IdlTypedef";
import { IdlTypeFlat, IdlTypeFlatFields } from "./IdlTypeFlat";
import {
  idlTypeFlatFieldsHydrate,
  idlTypeFlatHydrate,
} from "./IdlTypeFlatHydrate";
import { idlTypeFlatFieldsParse, idlTypeFlatParse } from "./IdlTypeFlatParse";
import { IdlTypeFull, IdlTypeFullFields } from "./IdlTypeFull";
import {
  idlTypeFullDecode,
  idlTypeFullFieldsDecode,
} from "./IdlTypeFullDecode";
import {
  idlTypeFullEncode,
  idlTypeFullFieldsEncode,
} from "./IdlTypeFullEncode";
import {
  idlUtilsAnchorDiscriminator,
  idlUtilsBytesJsonDecoder,
  idlUtilsExpectBlobAt,
} from "./IdlUtils";

/** A map from instruction account names to their resolved public key addresses. */
export type IdlInstructionAddresses = {
  [instructionAccountName: string]: Pubkey;
};

/** Parsed instruction with discriminator, accounts, args, and return type. */
export type IdlInstruction = {
  /** snake_case instruction name. */
  name: string;
  /** Documentation strings, or `undefined`. */
  docs: IdlDocs;
  /** Discriminator bytes prepended to serialised args. */
  discriminator: Uint8Array;
  /** Ordered accounts required by this instruction. */
  accounts: Array<IdlInstructionAccount>;
  /** Arg fields (flat and full). */
  args: {
    /** Flat arg type fields. */
    typeFlatFields: IdlTypeFlatFields;
    /** Full arg type fields. */
    typeFullFields: IdlTypeFullFields;
  };
  /** Return type (flat and full). */
  return: {
    /** Flat return type. */
    typeFlat: IdlTypeFlat;
    /** Full return type. */
    typeFull: IdlTypeFull;
  };
};

/**
 * Encodes named account addresses into an ordered {@link InstructionInput} array.
 * @param self - Instruction whose account list defines the order.
 * @param instructionAddresses - Named account addresses.
 * @returns Object with ordered `instructionInputs`.
 */
export function idlInstructionAccountsEncode(
  self: IdlInstruction,
  instructionAddresses: IdlInstructionAddresses,
) {
  const instructionInputs = new Array<InstructionInput>();
  for (const instructionAccountIdl of self.accounts) {
    const instructionAddress = objectGetOwnProperty(
      instructionAddresses,
      objectGuessIntendedKey(instructionAddresses, instructionAccountIdl.name),
    );
    if (instructionAddress === undefined) {
      if (instructionAccountIdl.optional) {
        continue;
      }
      throw new Error(
        `Idl: Missing address for instruction account: ${instructionAccountIdl.name}`,
      );
    }
    instructionInputs.push({
      address: instructionAddress,
      signer: instructionAccountIdl.signer,
      writable: instructionAccountIdl.writable,
    });
  }
  return { instructionInputs };
}

/**
 * Decodes ordered {@link InstructionInput}s into a named {@link IdlInstructionAddresses} map.
 * @param self - Instruction whose account list defines the mapping.
 * @param instructionInputs - Ordered account inputs.
 * @returns Object with decoded `instructionAddresses`.
 */
export function idlInstructionAccountsDecode(
  self: IdlInstruction,
  instructionInputs: Array<InstructionInput>,
) {
  let instructionOptionals = 0;
  for (const instructionAccountIdl of self.accounts) {
    if (instructionAccountIdl.optional) {
      instructionOptionals++;
    }
  }
  let inputsRequired = self.accounts.length - instructionOptionals;
  if (instructionInputs.length < inputsRequired) {
    throw new Error(
      `Idl: Not enough instruction inputs to decode all required accounts (required: ${inputsRequired}, found: ${instructionInputs.length})`,
    );
  }
  let inputsOptionals = instructionInputs.length - inputsRequired;
  let inputsIndex = 0;
  const instructionAddresses: IdlInstructionAddresses = {};
  for (const instructionAccountIdl of self.accounts) {
    if (instructionAccountIdl.optional) {
      if (inputsOptionals > 0) {
        inputsOptionals--;
      } else {
        continue;
      }
    }
    const instructionInput = instructionInputs[inputsIndex++]!;
    if (
      instructionInput.writable === false &&
      instructionAccountIdl.writable === true
    ) {
      throw new Error(
        `Idl: Instruction account ${instructionAccountIdl.name} expected to be writable`,
      );
    }
    instructionAddresses[instructionAccountIdl.name] = instructionInput.address;
  }
  return { instructionAddresses };
}

/**
 * Iteratively resolves all account addresses, deriving PDAs where possible.
 * @param self - Instruction whose accounts to resolve.
 * @param programAddress - Owning program address.
 * @param options.throwOnMissing - Throw if any required account stays unresolved.
 * @param options.instructionAddresses - Partial addresses to start from.
 * @param options.instructionPayload - Args used when derivation depends on args.
 * @param options.accountsContext - Pre-fetched account state context.
 * @param options.accountFetcher - Async function to fetch on-chain account data.
 * @returns Object with resolved `instructionAddresses`.
 */
export async function idlInstructionAccountsFind(
  self: IdlInstruction,
  programAddress: Pubkey,
  options?: {
    throwOnMissing?: boolean;
    instructionAddresses?: IdlInstructionAddresses;
    instructionPayload?: JsonValue;
    accountsContext?: IdlInstructionBlobAccountsContext;
    accountFetcher?: IdlInstructionBlobAccountFetcher;
  },
) {
  const instructionAddresses: IdlInstructionAddresses = {};
  if (options?.instructionAddresses !== undefined) {
    for (const [accountField, instructionAddress] of Object.entries(
      options?.instructionAddresses,
    )) {
      instructionAddresses[casingLosslessConvertToSnake(accountField)] =
        instructionAddress;
    }
  }
  const findContext: IdlInstructionAccountFindContext = {
    ...options,
    instructionAddresses,
  };
  while (true) {
    let madeProgress = false;
    let errors = [];
    for (let instructionAccountIdl of self.accounts) {
      const accountField = instructionAccountIdl.name;
      if (instructionAddresses.hasOwnProperty(accountField)) {
        continue;
      }
      try {
        await withErrorContext(
          `Idl: Finding address for instruction account ${accountField}`,
          async () => {
            instructionAddresses[accountField] =
              await idlInstructionAccountFind(
                instructionAccountIdl,
                programAddress,
                findContext,
              );
            madeProgress = true;
          },
        );
      } catch (error) {
        if (!instructionAccountIdl.optional) {
          errors.push(error);
        }
      }
    }
    if (!madeProgress) {
      if (options?.throwOnMissing && errors.length > 0) {
        throw new ErrorStack(
          `Idl: Could not resolve all instruction accounts`,
          errors,
        );
      }
      break;
    }
  }
  return { instructionAddresses };
}

/**
 * Validates that instruction inputs satisfy all required accounts.
 * @param self - Instruction to validate against.
 * @param instructionInputs - Account inputs to check.
 */
export function idlInstructionAccountsCheck(
  self: IdlInstruction,
  instructionInputs: Array<InstructionInput>,
): void {
  idlInstructionAccountsDecode(self, instructionInputs);
}

/**
 * Encodes a JSON instruction payload into binary, prepending the discriminator.
 * @param self - Instruction whose args schema and discriminator to use.
 * @param instructionPayload - Args as a JSON value.
 * @returns Object with encoded `instructionData` bytes.
 */
export function idlInstructionArgsEncode(
  self: IdlInstruction,
  instructionPayload: JsonValue,
) {
  return {
    instructionData: idlTypeFullFieldsEncode(
      self.args.typeFullFields,
      instructionPayload,
      { discriminator: self.discriminator },
    ),
  };
}

/**
 * Decodes binary instruction data into a JSON payload, verifying the discriminator.
 * @param self - Instruction whose args schema and discriminator to use.
 * @param instructionData - Binary data to decode.
 * @returns Object with decoded `instructionPayload`.
 */
export function idlInstructionArgsDecode(
  self: IdlInstruction,
  instructionData: Uint8Array,
) {
  idlInstructionArgsCheck(self, instructionData);
  const [, instructionPayload] = idlTypeFullFieldsDecode(
    self.args.typeFullFields,
    new DataView(instructionData.buffer),
    self.discriminator.length,
  );
  return { instructionPayload };
}

/**
 * Validates that binary instruction data starts with the correct discriminator.
 * @param self - Instruction whose discriminator to check.
 * @param instructionData - Binary data to validate.
 */
export function idlInstructionArgsCheck(
  self: IdlInstruction,
  instructionData: Uint8Array,
): void {
  idlUtilsExpectBlobAt(0, self.discriminator, instructionData);
}

/**
 * Encodes a JSON instruction return value into binary.
 * @param self - Instruction whose return type schema to use.
 * @param instructionResult - Return value as a JSON value.
 * @returns Object with encoded `instructionReturned` bytes.
 */
export function idlInstructionReturnEncode(
  self: IdlInstruction,
  instructionResult: JsonValue,
) {
  return {
    instructionReturned: idlTypeFullEncode(
      self.return.typeFull,
      instructionResult,
    ),
  };
}

/**
 * Decodes binary instruction return data into a JSON result value.
 * @param self - Instruction whose return type schema to use.
 * @param instructionReturned - Binary return data to decode.
 * @returns Object with decoded `instructionResult`.
 */
export function idlInstructionReturnDecode(
  self: IdlInstruction,
  instructionReturned: Uint8Array,
) {
  const [, instructionResult] = idlTypeFullDecode(
    self.return.typeFull,
    new DataView(instructionReturned.buffer),
    0,
  );
  return { instructionResult };
}

/**
 * Parses a raw IDL instruction JSON value into a fully-typed {@link IdlInstruction}.
 * @param instructionValue - Raw JSON value.
 * @param typedefsIdls - Known typedef definitions.
 * @returns Parsed {@link IdlInstruction}.
 */
export function idlInstructionParse(
  instructionName: string,
  instructionValue: JsonValue,
  typedefsIdls: Map<string, IdlTypedef>,
): IdlInstruction {
  const decoded = jsonDecoder(instructionValue);
  const argsTypeFlatFields = decoded.args ?? IdlTypeFlatFields.nothing();
  const argsTypeFullFields = idlTypeFlatFieldsHydrate(
    argsTypeFlatFields,
    new Map(),
    typedefsIdls,
  );
  const returnTypeFlat = decoded.returns ?? IdlTypeFlat.structNothing();
  const returnTypeFull = idlTypeFlatHydrate(
    returnTypeFlat,
    new Map(),
    typedefsIdls,
  );
  const accounts = new Array<IdlInstructionAccount>();
  if (decoded.accounts !== null) {
    for (const instructionAccount of decoded.accounts) {
      accounts.push(
        ...idlInstructionAccountParse(
          [],
          instructionAccount,
          argsTypeFullFields,
          typedefsIdls,
        ),
      );
    }
  }
  return {
    name: instructionName,
    docs: decoded.docs,
    discriminator:
      decoded.discriminator ??
      idlUtilsAnchorDiscriminator(`global:${instructionName}`),
    accounts,
    args: {
      typeFlatFields: argsTypeFlatFields,
      typeFullFields: argsTypeFullFields,
    },
    return: {
      typeFlat: returnTypeFlat,
      typeFull: returnTypeFull,
    },
  };
}

const jsonDecoder = jsonDecoderObjectToObject({
  docs: idlDocsParse,
  discriminator: jsonDecoderNullable(idlUtilsBytesJsonDecoder),
  args: jsonDecoderNullable(idlTypeFlatFieldsParse),
  returns: jsonDecoderNullable(idlTypeFlatParse),
  accounts: jsonDecoderNullable(jsonCodecArray.decoder),
});
