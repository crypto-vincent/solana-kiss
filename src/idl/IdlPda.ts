import {
  jsonCodecValue,
  jsonDecoderArrayToArray,
  jsonDecoderNullable,
  jsonDecoderObjectToObject,
  JsonValue,
} from "../data/Json";
import { Pubkey, pubkeyFindPdaAddress, pubkeyFromBytes } from "../data/Pubkey";
import { IdlDocs, idlDocsParse } from "./IdlDocs";
import { IdlPdaBlob, idlPdaBlobCompute, idlPdaBlobParse } from "./IdlPdaBlob";
import { IdlTypedef } from "./IdlTypedef";

// TODO - support nested inputs ?
/** A Program Derived Address definition with its seed blobs and an optional program override. */
export type IdlPda = {
  name: string;
  docs: IdlDocs;
  seeds: Array<IdlPdaBlob>;
  program: IdlPdaBlob | undefined;
};

/** Named input values supplied at runtime when computing a PDA's seed bytes. */
export type IdlPdaInputs = Record<string, JsonValue>;

/**
 * Parses a raw IDL PDA JSON value into an {@link IdlPda}, resolving all seed blobs and the optional program override.
 * @param pdaName - The name of the PDA.
 * @param pdaValue - The raw JSON value describing the PDA.
 * @param typedefsIdls - A map of known typedef definitions for type resolution.
 * @returns The parsed {@link IdlPda}.
 */
export function idlPdaParse(
  pdaName: string,
  pdaValue: JsonValue,
  typedefsIdls: Map<string, IdlTypedef>,
): IdlPda {
  const decoded = jsonDecoder(pdaValue);
  return {
    name: pdaName,
    docs: decoded.docs,
    seeds: decoded.seeds.map((seedValue) =>
      idlPdaBlobParse(seedValue, typedefsIdls),
    ),
    program: decoded.program
      ? idlPdaBlobParse(decoded.program, typedefsIdls)
      : undefined,
  };
}

/**
 * Derives the PDA public key from the given inputs, using the PDA's seeds and the provided (or embedded) program address.
 * @param self - The {@link IdlPda} definition containing seeds and optional program override.
 * @param inputs - Named input values used to compute the seed bytes.
 * @param programAddress - The owning program's {@link Pubkey}, required when the PDA has no embedded program override.
 * @returns The derived {@link Pubkey} address.
 * @throws If `programAddress` is not provided and the PDA definition does not embed a program.
 */
export function idlPdaFind(
  self: IdlPda,
  inputs: IdlPdaInputs,
  programAddress?: Pubkey,
) {
  const seedsBytes = self.seeds.map((seed) => idlPdaBlobCompute(seed, inputs));
  if (self.program !== undefined) {
    return pubkeyFindPdaAddress(
      pubkeyFromBytes(idlPdaBlobCompute(self.program, inputs)),
      seedsBytes,
    );
  }
  if (programAddress === undefined) {
    throw new Error("Idl: Program address must be provided");
  }
  return pubkeyFindPdaAddress(programAddress, seedsBytes);
}

const jsonDecoder = jsonDecoderObjectToObject({
  docs: idlDocsParse,
  seeds: jsonDecoderArrayToArray(jsonCodecValue.decoder),
  program: jsonDecoderNullable(jsonCodecValue.decoder),
});
