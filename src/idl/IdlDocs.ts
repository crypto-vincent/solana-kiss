import {
  jsonCodecString,
  jsonDecoderArrayToArray,
  jsonDecoderByType,
  jsonDecoderNullable,
  JsonValue,
} from "../data/Json";

export type IdlDocs = Array<string> | undefined;

/** Parses documentation strings from a JSON value, accepting either a string or an array of strings. */
export function idlDocsParse(docsValue: JsonValue): IdlDocs {
  return jsonDecoder(docsValue) ?? undefined;
}

const jsonDecoder = jsonDecoderNullable(
  jsonDecoderByType({
    string: (string: string) => [string],
    array: jsonDecoderArrayToArray(jsonCodecString.decoder),
  }),
);
