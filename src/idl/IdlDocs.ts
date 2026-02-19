import {
  jsonCodecString,
  jsonDecoderArrayToArray,
  jsonDecoderByType,
  jsonDecoderNullable,
  JsonValue,
} from "../data/Json";

export type IdlDocs = Array<string> | undefined;

/** Parses docs from JSON: accepts a string or string array. */
export function idlDocsParse(docsValue: JsonValue): IdlDocs {
  return jsonDecoder(docsValue) ?? undefined;
}

const jsonDecoder = jsonDecoderNullable(
  jsonDecoderByType({
    string: (string: string) => [string],
    array: jsonDecoderArrayToArray(jsonCodecString.decoder),
  }),
);
