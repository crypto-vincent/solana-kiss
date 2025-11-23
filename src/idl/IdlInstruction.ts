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

export type IdlInstructionAddresses = {
  [instructionAccountName: string]: Pubkey;
};

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
      instructionInput.signer === false &&
      instructionAccountIdl.signer === true
    ) {
      throw new Error(
        `Idl: Instruction account ${instructionAccountIdl.name} expected to be a signer`,
      );
    }
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

export async function idlInstructionAccountsFind(
  self: IdlInstruction,
  programAddress: Pubkey,
  options?: { throwOnMissing?: boolean } & IdlInstructionAccountFindContext,
) {
  const instructionAddresses: IdlInstructionAddresses = {};
  for (const [accountField, instructionAddress] of Object.entries(
    options?.instructionAddresses ?? {},
  )) {
    instructionAddresses[casingLosslessConvertToSnake(accountField)] =
      instructionAddress;
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

export function idlInstructionAccountsCheck(
  self: IdlInstruction,
  instructionInputs: Array<InstructionInput>,
): void {
  idlInstructionAccountsDecode(self, instructionInputs);
}

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

export function idlInstructionArgsCheck(
  self: IdlInstruction,
  instructionData: Uint8Array,
): void {
  idlUtilsExpectBlobAt(0, self.discriminator, instructionData);
}

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

export function idlInstructionParse(
  instructionName: string,
  instructionValue: JsonValue,
  typedefsIdls?: Map<string, IdlTypedef>,
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
