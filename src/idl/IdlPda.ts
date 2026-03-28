import { withErrorContext } from "../data/Error";
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

/** A Program Derived Address definition with its seed blobs and an optional program override. */
export type IdlPda = {
  /** The camelCase name of this PDA as declared in the IDL. */
  name: string;
  /** Human-readable documentation strings attached to this PDA, or `undefined`. */
  docs: IdlDocs;
  /** Ordered list of seed blobs used to derive the PDA address. */
  seeds: Array<IdlPdaBlob>;
  /**
   * An optional blob whose bytes resolve to the owning program address for this PDA.
   * When `undefined`, the caller must provide the program address.
   */
  program: IdlPdaBlob | undefined;
};

/**
 * Derives the PDA public key from seeds and the provided program address.
 * @param self - PDA definition with seeds and optional program override.
 * @param inputs - Named input values for seed blobs.
 * @param programAddress - Owning program address; required if PDA has no embedded program.
 * @returns Derived {@link Pubkey}.
 */
export function idlPdaFind(
  self: IdlPda,
  inputs: Record<string, JsonValue>,
  programAddress?: Pubkey,
) {
  const seedsBytes = self.seeds.map((seed, index) =>
    withErrorContext(`Idl: Pda: Seed: ${index}: Compute`, () =>
      idlPdaBlobCompute(seed, inputs),
    ),
  );
  const programBlob = self.program;
  if (programBlob !== undefined) {
    const programAddress = withErrorContext(`Idl: Pda: Program: Compute`, () =>
      pubkeyFromBytes(idlPdaBlobCompute(programBlob, inputs)),
    );
    return pubkeyFindPdaAddress(programAddress, seedsBytes);
  }
  if (programAddress === undefined) {
    throw new Error("Idl: Pda: Program address must be provided");
  }
  return pubkeyFindPdaAddress(programAddress, seedsBytes);
}

/**
 * Parses a raw IDL PDA JSON value into an {@link IdlPda}.
 * @param pdaValue - Raw JSON value.
 * @param typedefsIdls - Known typedef definitions.
 * @returns Parsed {@link IdlPda}.
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
    seeds: decoded.seeds.map((seedValue, seedIndex) =>
      withErrorContext(`Idl: Pda: Seed: ${seedIndex}: Parse`, () =>
        idlPdaBlobParse(seedValue, typedefsIdls),
      ),
    ),
    program: decoded.program
      ? withErrorContext(`Idl: Pda: Program: Parse`, () =>
          idlPdaBlobParse(decoded.program, typedefsIdls),
        )
      : undefined,
  };
}

const jsonDecoder = jsonDecoderObjectToObject({
  docs: idlDocsParse,
  seeds: jsonDecoderArrayToArray(jsonCodecValue.decoder),
  program: jsonDecoderNullable(jsonCodecValue.decoder),
});
