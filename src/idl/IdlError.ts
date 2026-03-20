import {
  JsonValue,
  jsonCodecNumber,
  jsonCodecString,
  jsonDecoderByType,
  jsonDecoderNullable,
  jsonDecoderObjectToObject,
} from "../data/Json";
import { IdlDocs, idlDocsParse } from "./IdlDocs";

/**
 * Represents a parsed IDL error definition, including its numeric error code,
 * optional message, and documentation.
 */
export type IdlError = {
  /** The camelCase name of the error as declared in the IDL. */
  name: string;
  /** Human-readable documentation strings attached to this error, or `undefined`. */
  docs: IdlDocs;
  /** The numeric error code returned on-chain when this error is triggered. */
  code: number;
  /** An optional human-readable error message, or `undefined` if not specified. */
  msg: string | undefined;
};

/**
 * Parses an IDL error definition from its raw JSON representation.
 * Accepts either a plain error code number or a full object with code, message, and docs.
 * @param errorName - The name of the error.
 * @param errorValue - The raw JSON value describing the error.
 * @returns The parsed {@link IdlError}.
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
