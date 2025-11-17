import { casingLosslessConvertToSnake } from "../data/Casing";
import { withErrorContext } from "../data/Error";
import {
  jsonCodecArrayValues,
  jsonCodecBoolean,
  jsonCodecPubkey,
  jsonCodecString,
  jsonCodecValue,
  jsonDecoderArray,
  jsonDecoderObject,
  jsonDecoderOptional,
  JsonValue,
} from "../data/Json";
import { Pubkey, pubkeyFindPdaAddress, pubkeyFromBytes } from "../data/Pubkey";
import { objectGetOwnProperty } from "../data/Utils";
import { IdlDocs, idlDocsParse } from "./IdlDocs";
import { IdlInstructionAddresses } from "./IdlInstruction";
import {
  IdlInstructionBlob,
  IdlInstructionBlobAccountFetcher,
  IdlInstructionBlobAccountsContext,
  idlInstructionBlobCompute,
  idlInstructionBlobParse,
} from "./IdlInstructionBlob";
import { IdlTypedef } from "./IdlTypedef";
import { IdlTypeFullFields } from "./IdlTypeFull";

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

export type IdlInstructionAccountFindContext = {
  instructionAddresses?: IdlInstructionAddresses;
  instructionPayload?: JsonValue | undefined;
  accountsContext?: IdlInstructionBlobAccountsContext;
  accountFetcher?: IdlInstructionBlobAccountFetcher;
};

export async function idlInstructionAccountFind(
  self: IdlInstructionAccount,
  programAddress: Pubkey,
  findContext: IdlInstructionAccountFindContext,
) {
  const instructionAddress = objectGetOwnProperty(
    findContext.instructionAddresses,
    self.name,
  );
  if (instructionAddress !== undefined) {
    return instructionAddress;
  }
  if (self.address !== undefined) {
    return self.address;
  }
  // TODO (experiment) - support from seed with a base address, or something more generic ?
  if (self.pda !== undefined) {
    const seedsBytes = new Array<Uint8Array>();
    for (const instructionBlobIdl of self.pda.seeds) {
      seedsBytes.push(
        await idlInstructionBlobCompute(instructionBlobIdl, findContext),
      );
    }
    let pdaProgramAddress = programAddress;
    if (self.pda.program !== undefined) {
      pdaProgramAddress = pubkeyFromBytes(
        await idlInstructionBlobCompute(self.pda.program, findContext),
      );
    }
    return pubkeyFindPdaAddress(pdaProgramAddress, seedsBytes);
  }
  throw new Error(
    `Idl: Could not find instruction account's address: ${self.name} (unresolvable)`,
  );
}

export function idlInstructionAccountParse(
  instructionAccountGroups: Array<string>,
  instructionAccountValue: JsonValue | undefined,
  instructionArgsTypeFullFields: IdlTypeFullFields,
  typedefsIdls?: Map<string, IdlTypedef>,
): Array<IdlInstructionAccount> {
  const decoded = jsonDecoder(instructionAccountValue);
  if (decoded.accounts !== undefined) {
    // TODO - docs field is lost in this case ?
    if (
      decoded.signer !== undefined ||
      decoded.isSigner !== undefined ||
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
  const pda = withErrorContext(
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
      name: [...instructionAccountGroups, decoded.name]
        .map(casingLosslessConvertToSnake)
        .join("."),
      docs: decoded.docs,
      writable: decoded.writable ?? decoded.isMut ?? false,
      signer: decoded.signer ?? decoded.isSigner ?? false,
      optional: decoded.optional ?? decoded.isOptional ?? false,
      address: decoded.address,
      pda,
    },
  ];
}

const jsonDecoder = jsonDecoderObject({
  name: jsonCodecString.decoder,
  docs: idlDocsParse,
  accounts: jsonDecoderOptional(jsonCodecArrayValues.decoder),
  signer: jsonDecoderOptional(jsonCodecBoolean.decoder),
  writable: jsonDecoderOptional(jsonCodecBoolean.decoder),
  isSigner: jsonDecoderOptional(jsonCodecBoolean.decoder),
  isMut: jsonDecoderOptional(jsonCodecBoolean.decoder),
  optional: jsonDecoderOptional(jsonCodecBoolean.decoder),
  isOptional: jsonDecoderOptional(jsonCodecBoolean.decoder),
  address: jsonDecoderOptional(jsonCodecPubkey.decoder),
  pda: jsonDecoderOptional(
    jsonDecoderObject({
      seeds: jsonDecoderArray(jsonCodecValue.decoder),
      program: jsonDecoderOptional(jsonCodecValue.decoder),
    }),
  ),
});
