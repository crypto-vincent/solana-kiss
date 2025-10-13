import { casingConvertToSnake } from "../data/Casing";
import {
  jsonCodecArrayRaw,
  jsonCodecBoolean,
  jsonCodecRaw,
  jsonCodecString,
  jsonDecoderArray,
  jsonDecoderObject,
  jsonDecoderOptional,
  JsonValue,
} from "../data/Json";
import { Pubkey, pubkeyFindPdaAddress, pubkeyFromBytes } from "../data/Pubkey";
import { withContext } from "../data/Utils";
import { IdlDocs, idlDocsParse } from "./IdlDocs";
import {
  IdlInstructionBlob,
  idlInstructionBlobCompute,
  IdlInstructionBlobContext,
  idlInstructionBlobParse,
} from "./IdlInstructionBlob";
import { IdlTypedef } from "./IdlTypedef";
import { IdlTypeFullFields } from "./IdlTypeFull";
import { idlUtilsPubkeyJsonDecoder } from "./IdlUtils";

export type IdlInstructionAccount = {
  name: string;
  docs: IdlDocs;
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
  instructionAccountGroups: Array<string>,
  instructionAccountValue: JsonValue,
  instructionArgsTypeFullFields: IdlTypeFullFields,
  typedefsIdls?: Map<string, IdlTypedef>,
): Array<IdlInstructionAccount> {
  const decoded = jsonDecoder(instructionAccountValue);
  if (decoded.accounts !== undefined) {
    if (
      decoded.signer !== undefined ||
      decoded.isSigner !== undefined ||
      decoded.signing !== undefined ||
      decoded.writable !== undefined ||
      decoded.isMut !== undefined ||
      decoded.optional !== undefined ||
      decoded.isOptional !== undefined ||
      decoded.address !== undefined ||
      decoded.pda !== undefined
    ) {
      throw new Error(
        `Idl: Instruction Account: Cannot mix nested accounts with other properties: ${decoded.name}`,
      );
    }
    const nestedAccounts = new Array<IdlInstructionAccount>();
    for (const nestedAccount of decoded.accounts) {
      nestedAccounts.push(
        ...idlInstructionAccountParse(
          [...instructionAccountGroups, decoded.name],
          nestedAccount,
          instructionArgsTypeFullFields,
          typedefsIdls,
        ),
      );
    }
    return nestedAccounts;
  }
  const pda = withContext(
    `Idl: Instruction Account: Pda: ${decoded.name}`,
    () => {
      if (decoded.pda === undefined) {
        return undefined;
      }
      const seeds = decoded.pda.seeds.map((seedValue) =>
        idlInstructionBlobParse(
          seedValue,
          instructionArgsTypeFullFields,
          typedefsIdls,
        ),
      );
      let program: IdlInstructionBlob | undefined = undefined;
      if (decoded.pda.program !== undefined) {
        program = idlInstructionBlobParse(
          decoded.pda.program,
          instructionArgsTypeFullFields,
          typedefsIdls,
        );
      }
      return { seeds, program };
    },
  );
  return [
    {
      name: casingConvertToSnake(
        [...instructionAccountGroups, decoded.name].join("."),
      ),
      docs: decoded.docs,
      writable: decoded.writable ?? decoded.isMut ?? false,
      signer: decoded.signer ?? decoded.isSigner ?? decoded.signing ?? false,
      optional: decoded.optional ?? decoded.isOptional ?? false,
      address: decoded.address,
      pda,
    },
  ];
}

const jsonDecoder = jsonDecoderObject({
  name: jsonCodecString.decoder,
  docs: idlDocsParse,
  accounts: jsonDecoderOptional(jsonCodecArrayRaw.decoder),
  signer: jsonDecoderOptional(jsonCodecBoolean.decoder),
  isSigner: jsonDecoderOptional(jsonCodecBoolean.decoder),
  signing: jsonDecoderOptional(jsonCodecBoolean.decoder),
  writable: jsonDecoderOptional(jsonCodecBoolean.decoder),
  isMut: jsonDecoderOptional(jsonCodecBoolean.decoder),
  optional: jsonDecoderOptional(jsonCodecBoolean.decoder),
  isOptional: jsonDecoderOptional(jsonCodecBoolean.decoder),
  address: jsonDecoderOptional(idlUtilsPubkeyJsonDecoder),
  pda: jsonDecoderOptional(
    jsonDecoderObject({
      seeds: jsonDecoderArray(jsonCodecRaw.decoder),
      program: jsonDecoderOptional(jsonCodecRaw.decoder),
    }),
  ),
});
