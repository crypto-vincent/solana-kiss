import {
  JsonValue,
  jsonCodecNumber,
  jsonCodecString,
  jsonDecoderByKind,
  jsonDecoderObject,
  jsonDecoderOptional,
} from "../data/Json";
import { IdlDocs, idlDocsParse } from "./IdlDocs";

export type IdlError = {
  name: string;
  docs: IdlDocs;
  code: number;
  msg: string | undefined;
};

export function idlErrorParse(
  errorName: string,
  errorValue: JsonValue,
): IdlError {
  const decoded = jsonDecoder(errorValue);
  return {
    name: errorName,
    docs: decoded.docs,
    code: decoded.code,
    msg: decoded.msg,
  };
}

export const jsonDecoder = jsonDecoderByKind({
  number: (number: number) => ({
    docs: undefined,
    code: number,
    msg: undefined,
  }),
  object: jsonDecoderObject({
    docs: idlDocsParse,
    code: jsonCodecNumber.decoder,
    msg: jsonDecoderOptional(jsonCodecString.decoder),
  }),
});
