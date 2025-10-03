import { camelCaseToSnakeCase } from "../data/Casing";
import {
  jsonDecodeBoolean,
  jsonDecoderArray,
  jsonDecoderObject,
  jsonDecoderOptional,
  jsonDecodeString,
  jsonDecodeValue,
  JsonValue,
} from "../data/Json";
import { Pubkey, pubkeyFindPdaAddress, pubkeyFromBytes } from "../data/Pubkey";
import { withContext } from "../data/Utils";
import {
  IdlInstructionBlob,
  idlInstructionBlobCompute,
  idlInstructionBlobParse,
} from "./IdlInstructionBlob";
import { IdlTypedef } from "./IdlTypedef";
import { IdlTypeFull, IdlTypeFullFields } from "./IdlTypeFull";

export type IdlInstructionAccount = {
  name: string;
  docs: any;
  writable: boolean;
  signer: boolean;
  optional: boolean;
  address: Pubkey | undefined;
  pda: IdlInstructionAccountPda | undefined;
};

export type IdlInstructionAccountPda = {
  seeds: Array<IdlInstructionBlob>;
  program: IdlInstructionBlob | undefined;
};

export function idlInstructionAccountFind(
  instructionAccountIdl: IdlInstructionAccount,
  instructionProgramAddress: Pubkey,
  instructionAddresses: Map<string, Pubkey>,
  instructionPayload: JsonValue,
  instructionAccountsStates: Map<string, JsonValue>,
  instructionAccountsContentsTypeFull: Map<string, IdlTypeFull>,
): Pubkey {
  const address = instructionAddresses.get(instructionAccountIdl.name);
  if (address !== undefined) {
    return address;
  }
  if (instructionAccountIdl.address !== undefined) {
    return instructionAccountIdl.address;
  }
  if (instructionAccountIdl.pda !== undefined) {
    const computeContext = {
      instructionProgramAddress,
      instructionPayload,
      instructionAddresses,
      instructionAccountsStates,
      instructionAccountsContentsTypeFull,
    };
    const seedsBytes = new Array<Uint8Array>();
    for (const instructionBlobIdl of instructionAccountIdl.pda.seeds) {
      seedsBytes.push(
        idlInstructionBlobCompute(instructionBlobIdl, computeContext),
      );
    }
    let pdaProgramAddress = instructionProgramAddress;
    if (instructionAccountIdl.pda.program !== undefined) {
      pdaProgramAddress = pubkeyFromBytes(
        idlInstructionBlobCompute(
          instructionAccountIdl.pda.program,
          computeContext,
        ),
      );
    }
    return pubkeyFindPdaAddress(pdaProgramAddress, seedsBytes);
  }
  throw new Error(
    `Idl: Could not find instruction account's address: ${instructionAccountIdl.name} (unresolvable)`,
  );
}

export function idlInstructionAccountParse(
  instructionAccountValue: JsonValue,
  instructionArgsTypeFullFields: IdlTypeFullFields,
  typedefsIdls: Map<string, IdlTypedef>,
): IdlInstructionAccount {
  const info = infoJsonDecode(instructionAccountValue);
  const pda = withContext(`Idl: Instruction Account: Pda: ${info.name}`, () => {
    if (info.pda === undefined) {
      return undefined;
    }
    const seeds = (info.pda.seeds ?? []).map((seedValue) =>
      idlInstructionBlobParse(
        seedValue,
        instructionArgsTypeFullFields,
        typedefsIdls,
      ),
    );
    let program: IdlInstructionBlob | undefined = undefined;
    if (info.pda.program !== undefined) {
      program = idlInstructionBlobParse(
        info.pda.program,
        instructionArgsTypeFullFields,
        typedefsIdls,
      );
    }
    return { seeds, program };
  });
  return {
    name: camelCaseToSnakeCase(info.name),
    docs: info.docs,
    writable: info.writable ?? info.isMut ?? false,
    signer: info.signer ?? info.isSigner ?? false,
    optional: info.optional ?? info.isOptional ?? false,
    address: info.address,
    pda,
  };
}

const infoJsonDecode = jsonDecoderObject({
  name: jsonDecodeString,
  docs: jsonDecodeValue,
  isSigner: jsonDecoderOptional(jsonDecodeBoolean),
  isMut: jsonDecoderOptional(jsonDecodeBoolean),
  isOptional: jsonDecoderOptional(jsonDecodeBoolean),
  signer: jsonDecoderOptional(jsonDecodeBoolean),
  writable: jsonDecoderOptional(jsonDecodeBoolean),
  optional: jsonDecoderOptional(jsonDecodeBoolean),
  address: jsonDecoderOptional(jsonDecodeString),
  pda: jsonDecoderOptional(
    jsonDecoderObject({
      seeds: jsonDecoderOptional(jsonDecoderArray(jsonDecodeValue)),
      program: jsonDecoderOptional(jsonDecodeValue),
    }),
  ),
});
