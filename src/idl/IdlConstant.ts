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

export type IdlConstant = {
  name: string;
  docs: IdlDocs;
  value: JsonValue;
  typeFlat: IdlTypeFlat;
  typeFull: IdlTypeFull;
};

/** Parses an IDL constant definition from a JSON value and a map of typedefs. */
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
