import {
  jsonDecoderByKind,
  jsonDecoderObject,
  jsonDecoderOptional,
  jsonDecodeValue,
  jsonExpectNumber,
  jsonExpectString,
  JsonValue,
} from "../data/Json";
import { Immutable } from "../data/Utils";

export type IdlError = {
  name: string;
  docs: any;
  code: number;
  msg: string | undefined;
};

export const idlErrorUnknown: Immutable<IdlError> = {
  name: "Unknown",
  docs: undefined,
  code: 0,
  msg: undefined,
};

export function idlErrorParse(
  errorName: string,
  errorValue: JsonValue,
): IdlError {
  const info = infoJsonDecode(errorValue);
  return {
    name: errorName,
    docs: info.docs,
    code: info.code,
    msg: info.msg,
  };
}

export const infoJsonDecode = jsonDecoderByKind<{
  docs: JsonValue;
  code: number;
  msg: string | undefined;
}>({
  number: (number: number) => ({
    docs: undefined,
    code: number,
    msg: undefined,
  }),
  object: jsonDecoderObject({
    docs: jsonDecodeValue,
    code: jsonExpectNumber,
    msg: jsonDecoderOptional(jsonExpectString),
  }),
});
