import { camelCaseToSnakeCase } from "../data/Casing";
import {
  jsonAsArray,
  jsonAsBoolean,
  jsonAsObject,
  jsonAsString,
  jsonExpectObject,
  jsonExpectString,
  JsonValue,
} from "../data/Json";
import { Pubkey, pubkeyFindPdaAddress, pubkeyFromBytes } from "../data/Pubkey";
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
  const instructionAccountObject = jsonExpectObject(instructionAccountValue);
  const instructionAccountName = camelCaseToSnakeCase(
    jsonExpectString(instructionAccountObject["name"]),
  );
  const docs = instructionAccountObject["docs"];
  const writable =
    jsonAsBoolean(instructionAccountObject["writable"]) ??
    jsonAsBoolean(instructionAccountObject["isMut"]) ??
    false;
  const signer =
    jsonAsBoolean(instructionAccountObject["signer"]) ??
    jsonAsBoolean(instructionAccountObject["isSigner"]) ??
    false;
  const optional =
    jsonAsBoolean(instructionAccountObject["optional"]) ??
    jsonAsBoolean(instructionAccountObject["isOptional"]) ??
    false;
  const address = jsonAsString(instructionAccountObject["address"]);
  let pda: IdlInstructionAccountPda | undefined = undefined;
  const pdaObject = jsonAsObject(instructionAccountObject["pda"]);
  if (pdaObject != undefined) {
    const seeds = (jsonAsArray(pdaObject["seeds"]) ?? []).map((seedValue) =>
      idlInstructionBlobParse(
        seedValue,
        instructionArgsTypeFullFields,
        typedefsIdls,
      ),
    );
    let program: IdlInstructionBlob | undefined = undefined;
    const pdaProgramValue = pdaObject["program"];
    if (pdaProgramValue !== undefined) {
      program = idlInstructionBlobParse(
        pdaProgramValue,
        instructionArgsTypeFullFields,
        typedefsIdls,
      );
    }
    pda = { seeds, program };
  }
  return {
    name: instructionAccountName,
    docs,
    writable,
    signer,
    optional,
    address,
    pda,
  };
}
