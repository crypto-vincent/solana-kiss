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

export type IdlPda = {
  name: string;
  docs: IdlDocs;
  seeds: Array<IdlPdaBlob>;
  program: IdlPdaBlob | undefined;
};

export type IdlPdaInputs = Record<string, JsonValue>;

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
