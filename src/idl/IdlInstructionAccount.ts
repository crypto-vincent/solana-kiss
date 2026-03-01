import { casingLosslessConvertToSnake } from "../data/Casing";
import { withErrorContext } from "../data/Error";
import {
  jsonCodecArray,
  jsonCodecBoolean,
  jsonCodecPubkey,
  jsonCodecString,
  jsonCodecValue,
  jsonDecoderArrayToArray,
  jsonDecoderNullable,
  jsonDecoderObjectToObject,
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

/** A single account entry in a Solana instruction's account list, including its constraints and optional PDA derivation. */
export type IdlInstructionAccount = {
  name: string;
  docs: IdlDocs;
  writable: boolean;
  signer: boolean;
  optional: boolean;
  address: Pubkey | undefined;
  pda: IdlInstructionAccountPda | undefined;
};

/** The PDA seeds and optional program override used to derive an instruction account's address. */
export type IdlInstructionAccountPda = {
  seeds: Array<IdlInstructionBlob>;
  program: IdlInstructionBlob | undefined;
};

/** The context available when searching for instruction account addresses, including already-resolved addresses and optional payload/account data. */
export type IdlInstructionAccountFindContext = {
  instructionAddresses: IdlInstructionAddresses;
  instructionPayload?: JsonValue;
  accountsContext?: IdlInstructionBlobAccountsContext;
  accountFetcher?: IdlInstructionBlobAccountFetcher;
};

/**
 * Resolves the public key address for a single instruction account, using a fixed address, PDA derivation, or the find context.
 * @param self - The {@link IdlInstructionAccount} to resolve.
 * @param programAddress - The on-chain address of the owning program (used for PDA derivation).
 * @param findContext - The resolution context containing already-known addresses and optional payload/account data.
 * @returns The resolved {@link Pubkey} address.
 * @throws If the address cannot be resolved from any available source.
 */
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

/**
 * Parses a raw IDL account JSON value into one or more {@link IdlInstructionAccount} entries, expanding nested account groups.
 * @param instructionAccountGroups - The accumulated parent group names for nested accounts.
 * @param instructionAccountValue - The raw JSON value describing the account or group.
 * @param instructionArgsTypeFullFields - The instruction's resolved argument fields, used for PDA seed blob parsing.
 * @param typedefsIdls - A map of known typedef definitions for type resolution.
 * @returns An array of parsed {@link IdlInstructionAccount} entries.
 */
export function idlInstructionAccountParse(
  instructionAccountGroups: Array<string>,
  instructionAccountValue: JsonValue,
  instructionArgsTypeFullFields: IdlTypeFullFields,
  typedefsIdls: Map<string, IdlTypedef>,
): Array<IdlInstructionAccount> {
  const decoded = jsonDecoder(instructionAccountValue);
  if (decoded.accounts !== null) {
    // TODO - docs field is lost in this case ?
    if (
      decoded.signer !== null ||
      decoded.isSigner !== null ||
      decoded.writable !== null ||
      decoded.isMut !== null ||
      decoded.optional !== null ||
      decoded.isOptional !== null ||
      decoded.address !== null ||
      decoded.pda !== null
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
      if (decoded.pda === null) {
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
      if (decoded.pda.program !== null) {
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
      address: decoded.address ?? undefined,
      pda,
    },
  ];
}

const jsonDecoder = jsonDecoderObjectToObject({
  name: jsonCodecString.decoder,
  docs: idlDocsParse,
  accounts: jsonDecoderNullable(jsonCodecArray.decoder),
  signer: jsonDecoderNullable(jsonCodecBoolean.decoder),
  writable: jsonDecoderNullable(jsonCodecBoolean.decoder),
  isSigner: jsonDecoderNullable(jsonCodecBoolean.decoder),
  isMut: jsonDecoderNullable(jsonCodecBoolean.decoder),
  optional: jsonDecoderNullable(jsonCodecBoolean.decoder),
  isOptional: jsonDecoderNullable(jsonCodecBoolean.decoder),
  address: jsonDecoderNullable(jsonCodecPubkey.decoder),
  pda: jsonDecoderNullable(
    jsonDecoderObjectToObject({
      seeds: jsonDecoderArrayToArray(jsonCodecValue.decoder),
      program: jsonCodecValue.decoder,
    }),
  ),
});
