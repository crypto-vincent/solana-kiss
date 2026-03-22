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

/** Single instruction account with constraints and optional PDA derivation. */
export type IdlInstructionAccount = {
  /** snake_case dotted account name. */
  name: string;
  /** Documentation strings, or `undefined`. */
  docs: IdlDocs;
  /** `true` if the instruction may write to this account. */
  writable: boolean;
  /** `true` if this account must sign the transaction. */
  signer: boolean;
  /** `true` if this account may be omitted. */
  optional: boolean;
  /** Fixed on-chain address, or `undefined` if supplied at call-time. */
  address: Pubkey | undefined;
  /** PDA derivation rules, or `undefined` if not a PDA. */
  pda: IdlInstructionAccountPda | undefined;
};

/** PDA seeds and optional program override for deriving an account address. */
export type IdlInstructionAccountPda = {
  /** Ordered seed blobs to derive the PDA address. */
  seeds: Array<IdlInstructionBlob>;
  /** Optional blob resolving to the owning program address; defaults to instruction's program. */
  program: IdlInstructionBlob | undefined;
};

/** Context for resolving instruction account addresses. */
export type IdlInstructionAccountFindContext = {
  /** Already-resolved account addresses keyed by account name. */
  instructionAddresses: IdlInstructionAddresses;
  /** Instruction args as JSON, used when derivation depends on arg values. */
  instructionPayload?: JsonValue;
  /** Pre-fetched on-chain account state for PDA seed resolution. */
  accountsContext?: IdlInstructionBlobAccountsContext;
  /** Async function to fetch on-chain account content by address. */
  accountFetcher?: IdlInstructionBlobAccountFetcher;
};

/**
 * Resolves the public key for a single instruction account.
 * @param self - Account to resolve.
 * @param programAddress - Owning program address (used for PDA derivation).
 * @param findContext - Resolution context with known addresses and payload.
 * @returns Resolved {@link Pubkey}.
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
    for (const pdaSeedBlob of self.pda.seeds) {
      seedsBytes.push(
        await idlInstructionBlobCompute(pdaSeedBlob, findContext),
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
 * Parses a raw IDL account JSON value into {@link IdlInstructionAccount} entries, expanding nested groups.
 * @param instructionAccountGroups - Accumulated parent group names for nested accounts.
 * @param instructionAccountValue - Raw JSON account or group value.
 * @param instructionArgsTypeFullFields - Resolved arg fields for PDA seed blob parsing.
 * @param typedefsIdls - Known typedef definitions.
 * @returns Array of parsed {@link IdlInstructionAccount} entries.
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
  let instructionAccountPda = undefined;
  if (decoded.pda !== null) {
    const seeds = decoded.pda.seeds.map((seedValue, seedIndex) =>
      withErrorContext(
        `Idl: Instruction Account: ${decoded.name}: Pda: Seed: ${seedIndex}`,
        () =>
          idlInstructionBlobParse(
            seedValue,
            instructionArgsTypeFullFields,
            typedefsIdls,
          ),
      ),
    );
    let program: IdlInstructionBlob | undefined = undefined;
    const decodedPdaProgram = decoded.pda.program;
    if (decodedPdaProgram !== null) {
      program = withErrorContext(
        `Idl: Instruction Account: ${decoded.name}: Pda: Program`,
        () =>
          idlInstructionBlobParse(
            decodedPdaProgram,
            instructionArgsTypeFullFields,
            typedefsIdls,
          ),
      );
    }
    instructionAccountPda = { seeds, program };
  }
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
      pda: instructionAccountPda,
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
