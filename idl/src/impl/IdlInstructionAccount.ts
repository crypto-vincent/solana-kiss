import {
  camelCaseToSnakeCase,
  jsonDecoderArray,
  jsonDecoderObject,
  jsonDecoderOptional,
  jsonTypeBoolean,
  jsonTypeString,
  jsonTypeValue,
  JsonValue,
  Pubkey,
  pubkeyFindPdaAddress,
  pubkeyFromBytes,
  withContext,
} from "solana-kiss-data";
import {
  IdlInstructionBlob,
  idlInstructionBlobCompute,
  IdlInstructionBlobContext,
  idlInstructionBlobParse,
} from "./IdlInstructionBlob";
import { IdlTypedef } from "./IdlTypedef";
import { IdlTypeFullFields } from "./IdlTypeFull";

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
  instructionBlobContext: IdlInstructionBlobContext,
): Pubkey {
  const address = instructionBlobContext.instructionAddresses.get(
    instructionAccountIdl.name,
  );
  if (address !== undefined) {
    return address;
  }
  if (instructionAccountIdl.address !== undefined) {
    return instructionAccountIdl.address;
  }
  if (instructionAccountIdl.pda !== undefined) {
    const seedsBytes = new Array<Uint8Array>();
    for (const instructionBlobIdl of instructionAccountIdl.pda.seeds) {
      seedsBytes.push(
        idlInstructionBlobCompute(instructionBlobIdl, instructionBlobContext),
      );
    }
    let pdaProgramAddress = instructionBlobContext.instructionProgramAddress;
    if (instructionAccountIdl.pda.program !== undefined) {
      pdaProgramAddress = pubkeyFromBytes(
        idlInstructionBlobCompute(
          instructionAccountIdl.pda.program,
          instructionBlobContext,
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
    signer: info.signer ?? info.isSigner ?? info.signing ?? false,
    optional: info.optional ?? info.isOptional ?? false,
    address: info.address,
    pda,
  };
}

const infoJsonDecode = jsonDecoderObject({
  name: jsonTypeString.decode,
  docs: jsonTypeValue.decode,
  signer: jsonDecoderOptional(jsonTypeBoolean.decode),
  isSigner: jsonDecoderOptional(jsonTypeBoolean.decode),
  signing: jsonDecoderOptional(jsonTypeBoolean.decode),
  writable: jsonDecoderOptional(jsonTypeBoolean.decode),
  isMut: jsonDecoderOptional(jsonTypeBoolean.decode),
  optional: jsonDecoderOptional(jsonTypeBoolean.decode),
  isOptional: jsonDecoderOptional(jsonTypeBoolean.decode),
  address: jsonDecoderOptional(jsonTypeString.decode),
  pda: jsonDecoderOptional(
    jsonDecoderObject({
      seeds: jsonDecoderOptional(jsonDecoderArray(jsonTypeValue.decode)),
      program: jsonDecoderOptional(jsonTypeValue.decode),
    }),
  ),
});
