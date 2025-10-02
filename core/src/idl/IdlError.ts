import {
  jsonDecodeNumber,
  jsonDecoderByKind,
  jsonDecoderObject,
  jsonDecoderOptional,
  jsonDecodeString,
  jsonDecodeValue,
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

export const idlErrorDecode = jsonDecoderByKind<{
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
    code: jsonDecodeNumber,
    msg: jsonDecoderOptional(jsonDecodeString),
  }),
});
