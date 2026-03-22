import {
  jsonCodecString,
  jsonDecoderArrayToArray,
  jsonDecoderByType,
  jsonDecoderNullable,
  JsonValue,
} from "../data/Json";

/** Documentation strings for an IDL item: array of strings, or `undefined`. */
export type IdlDocs = Array<string> | undefined;

/**
 * Parses documentation from a raw JSON value into {@link IdlDocs}.
 * @param docsValue - Raw JSON documentation value.
 * @returns Parsed docs, or `undefined`.
 */
export function idlDocsParse(docsValue: JsonValue): IdlDocs {
  return jsonDecoder(docsValue) ?? undefined;
}

const jsonDecoder = jsonDecoderNullable(
  jsonDecoderByType({
    string: (string: string) => [string],
    array: jsonDecoderArrayToArray(jsonCodecString.decoder),
  }),
);
