import { InstructionInput } from "../data/Instruction";
import {
  JsonValue,
  jsonCodecArrayRaw,
  jsonDecoderObject,
  jsonDecoderOptional,
} from "../data/Json";
import { Pubkey } from "../data/Pubkey";
import { objectGetOwnProperty, withErrorContext } from "../data/Utils";
import { IdlDocs, idlDocsParse } from "./IdlDocs";
import {
  IdlInstructionAccount,
  idlInstructionAccountFind,
  idlInstructionAccountParse,
} from "./IdlInstructionAccount";
import {
  IdlInstructionBlobAccountContents,
  IdlInstructionBlobInstructionContent,
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
      signer: instructionAccountIdl.signer,
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
  // TODO (safety) - improve the check logic
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
  return idlTypeFullFieldsEncode(
    instructionIdl.args.typeFullFields,
    instructionPayload,
    true,
    instructionIdl.discriminator,
  );
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

// TODO (test) - test this return decoding/encoding ?
export function idlInstructionReturnEncode(
  instructionIdl: IdlInstruction,
  instructionResult: JsonValue,
): Uint8Array {
  return idlTypeFullEncode(
    instructionIdl.return.typeFull,
    instructionResult,
    true,
  );
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

export async function idlInstructionAddressesHydrate(
  instructionIdl: IdlInstruction,
  programAddress: Pubkey,
  instructionContent: IdlInstructionBlobInstructionContent,
  accountsContents?: IdlInstructionBlobAccountContents,
): Promise<Record<string, Pubkey>> {
  const instructionAddresses = {
    ...instructionContent.instructionAddresses,
  };
  instructionContent = {
    instructionAddresses,
    instructionPayload: instructionContent.instructionPayload,
  };
  while (true) {
    let madeProgress = false;
    for (let instructionAccountIdl of instructionIdl.accounts) {
      const instructionAddress =
        instructionAddresses[instructionAccountIdl.name];
      if (instructionAddress !== undefined) {
        continue;
      }
      try {
        await withErrorContext(
          `Idl: Finding address for instruction account ${instructionAccountIdl.name}`,
          async () => {
            let instructionAddress = await idlInstructionAccountFind(
              instructionAccountIdl,
              programAddress,
              instructionContent,
              accountsContents,
            );
            instructionAddresses[instructionAccountIdl.name] =
              instructionAddress;
            madeProgress = true;
          },
        );
      } catch (error) {
        console.log(
          "Error fetching account data:",
          instructionAccountIdl.name,
          error,
        );
        // TODO (error) - better error handling and help with understanding what is missing
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
  accounts: jsonDecoderOptional(jsonCodecArrayRaw.decoder),
});
