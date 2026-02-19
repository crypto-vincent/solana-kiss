import {
  JsonValue,
  jsonCodecNumber,
  jsonCodecString,
  jsonDecoderByType,
  jsonDecoderNullable,
  jsonDecoderObjectToObject,
} from "../data/Json";
import { IdlDocs, idlDocsParse } from "./IdlDocs";

export type IdlError = {
  name: string;
  docs: IdlDocs;
  code: number;
  msg: string | undefined;
};

/** Parses an IDL error definition from a JSON value. */

export function idlErrorParse(
  errorName: string,
  errorValue: JsonValue,
): IdlError {
  const decoded = jsonDecoder(errorValue);
  return {
    name: errorName,
    docs: decoded.docs,
    code: decoded.code,
    msg: decoded.msg ?? undefined,
  };
}

const jsonDecoder = jsonDecoderByType({
  number: (number: number) => ({
    docs: undefined,
    code: number,
    msg: null,
  }),
  object: jsonDecoderObjectToObject({
    docs: idlDocsParse,
    code: jsonCodecNumber.decoder,
    msg: jsonDecoderNullable(jsonCodecString.decoder),
  }),
});
