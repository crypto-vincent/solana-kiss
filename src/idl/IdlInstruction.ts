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

/**
 * A parsed Solana program instruction, containing its discriminator, accounts list,
 * argument types, and return type.
 */
export type IdlInstruction = {
  name: string;
  docs: IdlDocs;
  discriminator: Uint8Array;
  accounts: Array<IdlInstructionAccount>;
  args: {
    typeFlatFields: IdlTypeFlatFields;
    typeFullFields: IdlTypeFullFields;
  };
  return: {
    typeFlat: IdlTypeFlat;
    typeFull: IdlTypeFull;
  };
};

/** Encodes a map of instruction account addresses into the ordered {@link InstructionInput} array required by the transaction builder. */
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

/** Decodes an ordered array of {@link InstructionInput}s back into a named {@link IdlInstructionAddresses} map. */
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
 * Iteratively resolves all account addresses for an instruction, deriving PDAs where possible.
 * Continues until no further progress can be made, optionally throwing if any required address remains unresolved.
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

/** Validates that the provided instruction inputs satisfy all required accounts defined in the IDL instruction. */
export function idlInstructionAccountsCheck(
  self: IdlInstruction,
  instructionInputs: Array<InstructionInput>,
): void {
  idlInstructionAccountsDecode(self, instructionInputs);
}

/** Encodes a JSON instruction payload into binary instruction data, prepending the discriminator. */
export function idlInstructionArgsEncode(
  self: IdlInstruction,
  instructionPayload: JsonValue,
) {
  return {
    instructionData: idlTypeFullFieldsEncode(
      self.args.typeFullFields,
      instructionPayload,
      true,
      self.discriminator,
    ),
  };
}

/** Decodes binary instruction data (after verifying its discriminator) into a JSON instruction payload. */
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

/** Validates that the binary instruction data starts with the correct discriminator for this instruction. */
export function idlInstructionArgsCheck(
  self: IdlInstruction,
  instructionData: Uint8Array,
): void {
  idlUtilsExpectBlobAt(0, self.discriminator, instructionData);
}

/** Encodes a JSON instruction return value into its binary representation. */
export function idlInstructionReturnEncode(
  self: IdlInstruction,
  instructionResult: JsonValue,
) {
  return {
    instructionReturned: idlTypeFullEncode(
      self.return.typeFull,
      instructionResult,
      true,
    ),
  };
}

/** Decodes binary instruction return data into a JSON result value. */
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

/** Parses a raw IDL instruction JSON value into a fully-typed {@link IdlInstruction}, resolving all typedefs. */
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
