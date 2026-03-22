import {
  JsonValue,
  jsonCodecString,
  jsonCodecValue,
  jsonDecoderObjectToObject,
} from "../data/Json";
import { IdlDocs, idlDocsParse } from "./IdlDocs";
import { IdlTypedef } from "./IdlTypedef";
import { IdlTypeFlat } from "./IdlTypeFlat";
import { idlTypeFlatHydrate } from "./IdlTypeFlatHydrate";
import { idlTypeFlatParse } from "./IdlTypeFlatParse";
import { IdlTypeFull } from "./IdlTypeFull";
import { idlUtilsJsonRustedParse } from "./IdlUtils";

/** Parsed IDL constant definition. */
export type IdlConstant = {
  /** camelCase constant name. */
  name: string;
  /** Documentation strings, or `undefined`. */
  docs: IdlDocs;
  /** Resolved JSON-compatible value. */
  value: JsonValue;
  /** Unresolved flat type. */
  typeFlat: IdlTypeFlat;
  /** Fully-resolved type for encoding and decoding. */
  typeFull: IdlTypeFull;
};

/**
 * Parses an IDL constant definition from its raw JSON representation.
 * @param constantValue - Raw JSON value.
 * @param typedefsIdls - Known typedef definitions.
 * @returns Parsed {@link IdlConstant}.
 */
export function idlConstantParse(
  constantName: string,
  constantValue: JsonValue,
  typedefsIdls: Map<string, IdlTypedef>,
): IdlConstant {
  const decoded = jsonDecoder(constantValue);
  const value = idlUtilsJsonRustedParse(decoded.value);
  const typeFlat = idlTypeFlatParse(decoded.type);
  const typeFull = idlTypeFlatHydrate(typeFlat, new Map(), typedefsIdls);
  return {
    name: constantName,
    docs: decoded.docs,
    value,
    typeFlat,
    typeFull,
  };
}

const jsonDecoder = jsonDecoderObjectToObject({
  docs: idlDocsParse,
  value: jsonCodecString.decoder,
  type: jsonCodecValue.decoder,
});
