import {
  JsonValue,
  jsonCodecNumber,
  jsonCodecString,
  jsonDecoderByType,
  jsonDecoderNullable,
  jsonDecoderObjectToObject,
} from "../data/Json";
import { IdlDocs, idlDocsParse } from "./IdlDocs";

/** Parsed IDL error definition. */
export type IdlError = {
  /** camelCase error name. */
  name: string;
  /** Documentation strings, or `undefined`. */
  docs: IdlDocs;
  /** Numeric error code. */
  code: number;
  /** Human-readable error message, or `undefined`. */
  msg: string | undefined;
};

/**
 * Parses an IDL error definition from its raw JSON representation.
 * @param errorName - Error name.
 * @param errorValue - Raw JSON value.
 * @returns Parsed {@link IdlError}.
 */
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
