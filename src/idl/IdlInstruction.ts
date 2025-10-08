import { Instruction, InstructionInput } from "../data/Instruction";
import {
  JsonValue,
  jsonCodecArrayRaw,
  jsonDecoderObject,
  jsonDecoderOptional,
} from "../data/Json";
import { Pubkey } from "../data/Pubkey";
import { withContext } from "../data/Utils";
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
import { idlTypeFullFieldsDecode } from "./IdlTypeFullDecode";
import { idlTypeFullFieldsEncode } from "./IdlTypeFullEncode";
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
  argsTypeFlatFields: IdlTypeFlatFields;
  argsTypeFullFields: IdlTypeFullFields;
  returnTypeFlat: IdlTypeFlat;
  returnTypeFull: IdlTypeFull;
};

export function idlInstructionEncode(
  instructionIdl: IdlInstruction,
  instructionProgramAddress: Pubkey,
  instructionAddresses: Map<string, Pubkey>,
  instructionPayload: JsonValue,
): Instruction {
  const instructionInputs = idlInstructionAccountsEncode(
    instructionIdl,
    instructionAddresses,
  );
  const instructionData = idlInstructionArgsEncode(
    instructionIdl,
    instructionPayload,
  );
  return {
    programAddress: instructionProgramAddress,
    inputs: instructionInputs,
    data: instructionData,
  };
}

export function idlInstructionDecode(
  instructionIdl: IdlInstruction,
  instruction: Instruction,
): {
  instructionProgramAddress: Pubkey;
  instructionAddresses: Map<string, Pubkey>;
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
  instructionAddresses: Map<string, Pubkey>,
): Array<InstructionInput> {
  const instructionInputs = new Array<InstructionInput>();
  for (const instructionAccountIdl of instructionIdl.accounts) {
    if (
      instructionAccountIdl.optional &&
      !instructionAddresses.has(instructionAccountIdl.name)
    ) {
      continue;
    }
    const instructionAddress = instructionAddresses.get(
      instructionAccountIdl.name,
    );
    if (!instructionAddress) {
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
): Map<string, Pubkey> {
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
  const instructionAddresses = new Map<string, Pubkey>();
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
    instructionAddresses.set(
      instructionAccountIdl.name,
      instructionInputs[instructionInputIndex]!.address,
    );
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
    instructionIdl.argsTypeFullFields,
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
  const [, payload] = idlTypeFullFieldsDecode(
    instructionIdl.argsTypeFullFields,
    new DataView(instructionData.buffer),
    instructionIdl.discriminator.length,
  );
  return payload;
}

export function idlInstructionArgsCheck(
  instructionIdl: IdlInstruction,
  instructionData: Uint8Array,
): void {
  idlUtilsExpectBlobAt(0, instructionIdl.discriminator, instructionData);
}

export function idlInstructionAddressesFind(
  instructionIdl: IdlInstruction,
  instructionBlobContext: IdlInstructionBlobContext,
): Map<string, Pubkey> {
  const instructionAddresses = new Map<string, Pubkey>(
    instructionBlobContext.instructionAddresses,
  );
  instructionBlobContext = {
    ...instructionBlobContext,
    instructionAddresses,
  };
  while (true) {
    let madeProgress = false;
    for (let instructionAccountIdl of instructionIdl.accounts) {
      if (instructionAddresses.has(instructionAccountIdl.name)) {
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
            instructionAddresses.set(
              instructionAccountIdl.name,
              instructionAddress,
            );
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
  const accounts = (decoded.accounts ?? []).map((instructionAccount) => {
    return idlInstructionAccountParse(
      instructionAccount,
      argsTypeFullFields,
      typedefsIdls,
    );
  });
  return {
    name: instructionName,
    docs: decoded.docs,
    discriminator:
      decoded.discriminator ??
      idlUtilsDiscriminator(`global:${instructionName}`),
    accounts,
    argsTypeFlatFields,
    argsTypeFullFields,
    returnTypeFlat,
    returnTypeFull,
  };
}

const jsonDecoder = jsonDecoderObject({
  docs: idlDocsParse,
  discriminator: jsonDecoderOptional(idlUtilsBytesJsonDecoder),
  args: jsonDecoderOptional(idlTypeFlatFieldsParse),
  returns: jsonDecoderOptional(idlTypeFlatParse),
  accounts: jsonDecoderOptional(jsonCodecArrayRaw.decoder),
});
