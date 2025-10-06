import {
  JsonValue,
  jsonDecoderByKind,
  jsonDecoderObject,
  jsonDecoderOptional,
  jsonTypeNumber,
  jsonTypeString,
  jsonTypeValue,
} from "../data/Json";

export type IdlError = {
  name: string;
  docs: any;
  code: number;
  msg: string | undefined;
};

export function idlErrorParse(
  errorName: string,
  errorValue: JsonValue,
): IdlError {
  const info = infoJsonDecoder(errorValue);
  return {
    name: errorName,
    docs: info.docs,
    code: info.code,
    msg: info.msg,
  };
}

export const infoJsonDecoder = jsonDecoderByKind<{
  docs: JsonValue;
  code: number;
  msg: string | undefined;
}>({
  number: (number: number) => ({
    docs: undefined,
    code: number,
    msg: undefined,
  }),
  object: jsonDecoderObject((key) => key, {
    docs: jsonTypeValue.decoder,
    code: jsonTypeNumber.decoder,
    msg: jsonDecoderOptional(jsonTypeString.decoder),
  }),
});
