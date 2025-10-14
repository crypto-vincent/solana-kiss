import { Instruction, InstructionInput } from "../data/Instruction";
import {
  JsonValue,
  jsonCodecArrayRaw,
  jsonDecoderObject,
  jsonDecoderOptional,
} from "../data/Json";
import { Pubkey } from "../data/Pubkey";
import { objectGetOwnProperty, withContext } from "../data/Utils";
import { IdlDocs, idlDocsParse } from "./IdlDocs";
import {
  IdlInstructionAccount,
  idlInstructionAccountFind,
  idlInstructionAccountParse,
} from "./IdlInstructionAccount";
import { IdlInstructionBlobContext } from "./IdlInstructionBlob";
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
  idlUtilsBytesJsonDecoder,
  idlUtilsDiscriminator,
  idlUtilsExpectBlobAt,
  idlUtilsFlattenBlobs,
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

// TODO (naming) - should the returned type be an object for naming convenience?
export function idlInstructionEncode(
  instructionIdl: IdlInstruction,
  instructionProgramAddress: Pubkey,
  instructionAddresses: Record<string, Pubkey>,
  instructionPayload: JsonValue,
): Instruction {
  // TODO (service) - auto resolve the program address from the program idl when possible ?
  const instructionInputs = idlInstructionAccountsEncode(
    instructionIdl,
    instructionAddresses,
  );
  const instructionData = idlInstructionArgsEncode(
    instructionIdl,
    instructionPayload,
  );
  const instruction = {
    programAddress: instructionProgramAddress,
    inputs: instructionInputs,
    data: instructionData,
  };
  return instruction;
}

export function idlInstructionDecode(
  instructionIdl: IdlInstruction,
  instruction: Instruction,
): {
  // TODO (naming) - "InstructionInputsAddresses?" should this be a map or an object ?
  instructionProgramAddress: Pubkey;
  instructionAddresses: Record<string, Pubkey>;
  instructionPayload: JsonValue;
} {
  idlInstructionCheck(instructionIdl, instruction.inputs, instruction.data);
  const instructionAddresses = idlInstructionAccountsDecode(
    instructionIdl,
    instruction.inputs,
  );
  const instructionPayload = idlInstructionArgsDecode(
    instructionIdl,
    instruction.data,
  );
  return {
    instructionProgramAddress: instruction.programAddress,
    instructionAddresses,
    instructionPayload,
  };
}

export function idlInstructionCheck(
  instructionIdl: IdlInstruction,
  instructionInputs: Array<InstructionInput>,
  instructionData: Uint8Array,
): void {
  idlInstructionAccountsCheck(instructionIdl, instructionInputs);
  idlInstructionArgsCheck(instructionIdl, instructionData);
}

export function idlInstructionAccountsEncode(
  instructionIdl: IdlInstruction,
  instructionAddresses: Record<string, Pubkey>,
): Array<InstructionInput> {
  const instructionInputs = new Array<InstructionInput>();
  for (const instructionAccountIdl of instructionIdl.accounts) {
    const instructionAddress = objectGetOwnProperty(
      instructionAddresses,
      instructionAccountIdl.name,
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
      signing: instructionAccountIdl.signer,
      writable: instructionAccountIdl.writable,
    });
  }
  return instructionInputs;
}

export function idlInstructionAccountsDecode(
  instructionIdl: IdlInstruction,
  instructionInputs: Array<InstructionInput>,
): Record<string, Pubkey> {
  idlInstructionAccountsCheck(instructionIdl, instructionInputs);
  let instructionOptionalsPossible = 0;
  for (const instructionAccountIdl of instructionIdl.accounts) {
    if (instructionAccountIdl.optional) {
      instructionOptionalsPossible++;
    }
  }
  const instructionOptionalsUnuseds =
    instructionIdl.accounts.length - instructionInputs.length;
  const instructionOptionalsUsed =
    instructionOptionalsPossible - instructionOptionalsUnuseds;
  const instructionAddresses: Record<string, Pubkey> = {};
  let instructionInputIndex = 0;
  let instructionOptionalsCurrent = 0;
  for (const instructionAccountIdl of instructionIdl.accounts) {
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
  instructionIdl: IdlInstruction,
  instructionInputs: Array<InstructionInput>,
): void {
  // TODO - improve the check logic
  let requiredCount = 0;
  for (const instructionAccountIdl of instructionIdl.accounts) {
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
  instructionIdl: IdlInstruction,
  instructionPayload: JsonValue,
): Uint8Array {
  const blobs = new Array<Uint8Array>();
  blobs.push(instructionIdl.discriminator);
  idlTypeFullFieldsEncode(
    instructionIdl.args.typeFullFields,
    instructionPayload,
    blobs,
    true,
  );
  return idlUtilsFlattenBlobs(blobs);
}

export function idlInstructionArgsDecode(
  instructionIdl: IdlInstruction,
  instructionData: Uint8Array,
): JsonValue {
  idlInstructionArgsCheck(instructionIdl, instructionData);
  const [, instructionPayload] = idlTypeFullFieldsDecode(
    instructionIdl.args.typeFullFields,
    new DataView(instructionData.buffer),
    instructionIdl.discriminator.length,
  );
  return instructionPayload;
}

export function idlInstructionArgsCheck(
  instructionIdl: IdlInstruction,
  instructionData: Uint8Array,
): void {
  idlUtilsExpectBlobAt(0, instructionIdl.discriminator, instructionData);
}

// TODO - test this return decoding/encoding ?
export function idlInstructionReturnEncode(
  instructionIdl: IdlInstruction,
  instructionResult: JsonValue,
): Uint8Array {
  const blobs = new Array<Uint8Array>();
  idlTypeFullEncode(
    instructionIdl.return.typeFull,
    instructionResult,
    blobs,
    true,
  );
  return idlUtilsFlattenBlobs(blobs);
}

export function idlInstructionReturnDecode(
  instructionIdl: IdlInstruction,
  instructionReturned: Uint8Array,
): JsonValue {
  const [, instructionResult] = idlTypeFullDecode(
    instructionIdl.return.typeFull,
    new DataView(instructionReturned.buffer),
    instructionIdl.discriminator.length,
  );
  return instructionResult;
}

// TODO (service) - this should be in a higher level module ?
export function idlInstructionAddressesFind(
  instructionIdl: IdlInstruction,
  instructionBlobContext: IdlInstructionBlobContext,
): Record<string, Pubkey> {
  const instructionAddresses = {
    ...instructionBlobContext.instructionAddresses,
  };
  instructionBlobContext = {
    ...instructionBlobContext,
    instructionAddresses,
  };
  while (true) {
    let madeProgress = false;
    for (let instructionAccountIdl of instructionIdl.accounts) {
      if (instructionAddresses.hasOwnProperty(instructionAccountIdl.name)) {
        continue;
      }
      try {
        withContext(
          `Idl: Finding address for instruction account ${instructionAccountIdl.name}`,
          () => {
            let instructionAddress = idlInstructionAccountFind(
              instructionAccountIdl,
              instructionBlobContext,
            );
            instructionAddresses[instructionAccountIdl.name] =
              instructionAddress;
            madeProgress = true;
          },
        );
      } catch (_) {
        // TODO - better error handling and help with understanding what is missing
        // Ignore errors, we might not have enough info yet
      }
    }
    if (!madeProgress) {
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
  for (const instructionAccount of decoded.accounts ?? []) {
    accounts.push(
      ...idlInstructionAccountParse(
        [],
        instructionAccount,
        argsTypeFullFields,
        typedefsIdls,
      ),
    );
  }
  return {
    name: instructionName,
    docs: decoded.docs,
    discriminator:
      decoded.discriminator ??
      idlUtilsDiscriminator(`global:${instructionName}`),
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
  accounts: jsonDecoderOptional(jsonCodecArrayRaw.decoder),
});
