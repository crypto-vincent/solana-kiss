import {
  jsonDecoderObject,
  jsonDecoderOptional,
  jsonDecodeValue,
  jsonExpectArray,
  JsonValue,
} from "../data/Json";
import { Input, Instruction } from "../data/Onchain";
import { Pubkey } from "../data/Pubkey";
import { Immutable } from "../data/Utils";
import {
  IdlInstructionAccount,
  idlInstructionAccountFind,
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
import { idlTypeFullFieldsDeserialize } from "./IdlTypeFullDeserialize";
import { idlTypeFullFieldsSerialize } from "./IdlTypeFullSerialize";
import {
  idlUtilsBytesJsonDecode,
  idlUtilsDiscriminator,
  idlUtilsExpectBlobAt,
  idlUtilsFlattenBlobs,
} from "./IdlUtils";

export type IdlInstruction = {
  name: string;
  docs: any;
  discriminator: Uint8Array;
  accounts: Array<IdlInstructionAccount>;
  argsTypeFlatFields: IdlTypeFlatFields;
  argsTypeFullFields: IdlTypeFullFields;
  returnTypeFlat: IdlTypeFlat;
  returnTypeFull: IdlTypeFull;
};

export const idlInstructionUnknown: Immutable<IdlInstruction> = {
  name: "unknown",
  docs: undefined,
  discriminator: new Uint8Array(),
  accounts: [],
  argsTypeFlatFields: IdlTypeFlatFields.nothing(),
  argsTypeFullFields: IdlTypeFullFields.nothing(),
  returnTypeFlat: IdlTypeFlat.structNothing(),
  returnTypeFull: IdlTypeFull.structNothing(),
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
  instructionInputs: Array<Input>,
  instructionData: Uint8Array,
): void {
  idlInstructionAccountsCheck(instructionIdl, instructionInputs);
  idlInstructionArgsCheck(instructionIdl, instructionData);
}

export function idlInstructionAccountsEncode(
  instructionIdl: IdlInstruction,
  instructionAddresses: Map<string, Pubkey>,
): Array<Input> {
  const instructionInputs = new Array<Input>();
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
  instructionInputs: Array<Input>,
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
  instructionInputs: Array<Input>,
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
  idlTypeFullFieldsSerialize(
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
  const [, payload] = idlTypeFullFieldsDeserialize(
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
  instructionProgramAddress: Pubkey,
  instructionAddresses: Map<string, Pubkey>,
  instructionPayload: JsonValue,
): Map<string, Pubkey> {
  return idlInstructionAddressesFindWithAccounts(
    instructionIdl,
    instructionProgramAddress,
    instructionAddresses,
    instructionPayload,
    new Map(),
    new Map(),
  );
}

// TODO - pass directly the compute context ?
export function idlInstructionAddressesFindWithAccounts(
  instructionIdl: IdlInstruction,
  instructionProgramAddress: Pubkey,
  instructionAddresses: Map<string, Pubkey>,
  instructionPayload: JsonValue,
  instructionAccountsStates: Map<string, JsonValue>,
  instructionAccountsContentsTypeFull: Map<string, IdlTypeFull>,
): Map<string, Pubkey> {
  instructionAddresses = new Map<string, Pubkey>(instructionAddresses);
  while (true) {
    let madeProgress = false;
    for (let instructionAccountIdl of instructionIdl.accounts) {
      if (instructionAddresses.has(instructionAccountIdl.name)) {
        continue;
      }
      try {
        let instructionAddress = idlInstructionAccountFind(
          instructionAccountIdl,
          instructionProgramAddress,
          instructionAddresses,
          instructionPayload,
          instructionAccountsStates,
          instructionAccountsContentsTypeFull,
        );
        instructionAddresses.set(
          instructionAccountIdl.name,
          instructionAddress,
        );
        madeProgress = true;
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
  typedefsIdls: Map<string, IdlTypedef>,
): IdlInstruction {
  const info = infoJsonDecode(instructionValue);
  const argsTypeFlatFields = info.args ?? IdlTypeFlatFields.nothing();
  const argsTypeFullFields = idlTypeFlatFieldsHydrate(
    argsTypeFlatFields,
    new Map(),
    typedefsIdls,
  );
  const returnTypeFlat = info.returns ?? IdlTypeFlat.structNothing();
  const returnTypeFull = idlTypeFlatHydrate(
    returnTypeFlat,
    new Map(),
    typedefsIdls,
  );
  const accounts = (info.accounts ?? []).map((instructionAccount) => {
    return idlInstructionAccountParse(
      instructionAccount,
      argsTypeFullFields,
      typedefsIdls,
    );
  });
  return {
    name: instructionName,
    docs: info.docs,
    discriminator:
      info.discriminator ?? idlUtilsDiscriminator(`global:${instructionName}`),
    accounts,
    argsTypeFlatFields,
    argsTypeFullFields,
    returnTypeFlat,
    returnTypeFull,
  };
}

const infoJsonDecode = jsonDecoderObject({
  docs: jsonDecodeValue,
  discriminator: jsonDecoderOptional(idlUtilsBytesJsonDecode),
  args: jsonDecoderOptional(idlTypeFlatFieldsParse),
  returns: jsonDecoderOptional(idlTypeFlatParse),
  accounts: jsonDecoderOptional(jsonExpectArray),
});
