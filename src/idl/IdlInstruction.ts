import { casingLosslessConvertToSnake } from "../data/Casing";
import { ErrorStack, withErrorContext } from "../data/Error";
import {
  InstructionAddresses,
  InstructionFrame,
  InstructionInput,
} from "../data/Instruction";
import {
  JsonValue,
  jsonCodecArrayValues,
  jsonDecoderObject,
  jsonDecoderOptional,
} from "../data/Json";
import { Pubkey } from "../data/Pubkey";
import { objectGetOwnProperty, objectGuessIntendedKey } from "../data/Utils";
import { IdlDocs, idlDocsParse } from "./IdlDocs";
import {
  IdlInstructionAccount,
  idlInstructionAccountFind,
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
  instructionAddresses: InstructionAddresses,
): Array<InstructionInput> {
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
  return instructionInputs;
}

export function idlInstructionAccountsDecode(
  self: IdlInstruction,
  instructionInputs: Array<InstructionInput>,
): InstructionAddresses {
  idlInstructionAccountsCheck(self, instructionInputs);
  let instructionOptionalsPossible = 0;
  for (const instructionAccountIdl of self.accounts) {
    if (instructionAccountIdl.optional) {
      instructionOptionalsPossible++;
    }
  }
  const instructionOptionalsUnuseds =
    self.accounts.length - instructionInputs.length;
  const instructionOptionalsUsed =
    instructionOptionalsPossible - instructionOptionalsUnuseds;
  const instructionAddresses: Record<string, Pubkey> = {};
  let instructionInputIndex = 0;
  let instructionOptionalsCurrent = 0;
  for (const instructionAccountIdl of self.accounts) {
    if (instructionAccountIdl.optional) {
      instructionOptionalsCurrent += 1;
      if (instructionOptionalsCurrent > instructionOptionalsUsed) {
        continue;
      }
    }
    if (instructionInputIndex >= instructionInputs.length) {
      break;
    }
    instructionAddresses[instructionAccountIdl.name] =
      instructionInputs[instructionInputIndex]!.address;
    instructionInputIndex++;
  }
  return instructionAddresses;
}

export function idlInstructionAccountsCheck(
  self: IdlInstruction,
  instructionInputs: Array<InstructionInput>,
): void {
  // TODO (safety) - improve the check logic
  let requiredCount = 0;
  for (const instructionAccountIdl of self.accounts) {
    if (!instructionAccountIdl.optional) {
      requiredCount++;
    }
  }
  if (instructionInputs.length < requiredCount) {
    throw new Error(
      `Idl: Expected at least ${requiredCount} instruction inputs (found: ${instructionInputs.length})`,
    );
  }
}

export function idlInstructionArgsEncode(
  self: IdlInstruction,
  instructionPayload: JsonValue | undefined,
): Uint8Array {
  return idlTypeFullFieldsEncode(
    self.args.typeFullFields,
    instructionPayload,
    true,
    self.discriminator,
  );
}

export function idlInstructionArgsDecode(
  self: IdlInstruction,
  instructionData: Uint8Array,
): JsonValue {
  idlInstructionArgsCheck(self, instructionData);
  const [, instructionPayload] = idlTypeFullFieldsDecode(
    self.args.typeFullFields,
    new DataView(instructionData.buffer),
    self.discriminator.length,
  );
  return instructionPayload;
}

export function idlInstructionArgsCheck(
  self: IdlInstruction,
  instructionData: Uint8Array,
): void {
  idlUtilsExpectBlobAt(0, self.discriminator, instructionData);
}

// TODO (test) - test this return decoding/encoding ?
export function idlInstructionReturnEncode(
  self: IdlInstruction,
  instructionResult: JsonValue | undefined,
): Uint8Array {
  return idlTypeFullEncode(self.return.typeFull, instructionResult, true);
}

export function idlInstructionReturnDecode(
  self: IdlInstruction,
  instructionReturned: Uint8Array,
): JsonValue {
  const [, instructionResult] = idlTypeFullDecode(
    self.return.typeFull,
    new DataView(instructionReturned.buffer),
    self.discriminator.length,
  );
  return instructionResult;
}

export async function idlInstructionAddressesHydrate(
  self: IdlInstruction,
  programAddress: Pubkey,
  instructionFramePartial?: Partial<InstructionFrame>,
  options?: {
    throwOnMissing?: boolean;
    accountsContext?: IdlInstructionBlobAccountsContext;
    accountFetcher?: IdlInstructionBlobAccountFetcher;
  },
) {
  const instructionAddresses: InstructionAddresses = {};
  for (const [accountField, instructionAddress] of Object.entries(
    instructionFramePartial?.addresses ?? {},
  )) {
    instructionAddresses[casingLosslessConvertToSnake(accountField)] =
      instructionAddress;
  }
  const hydratedInstructionFrame: InstructionFrame = {
    addresses: instructionAddresses,
    payload: instructionFramePartial?.payload,
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
                hydratedInstructionFrame,
                options?.accountsContext,
                options?.accountFetcher,
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
  return instructionAddresses;
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
  if (decoded.accounts !== undefined) {
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

const jsonDecoder = jsonDecoderObject({
  docs: idlDocsParse,
  discriminator: jsonDecoderOptional(idlUtilsBytesJsonDecoder),
  args: jsonDecoderOptional(idlTypeFlatFieldsParse),
  returns: jsonDecoderOptional(idlTypeFlatParse),
  accounts: jsonDecoderOptional(jsonCodecArrayValues.decoder),
});
