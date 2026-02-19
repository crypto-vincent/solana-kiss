import {
  jsonCodecString,
  jsonDecoderArrayToArray,
  jsonDecoderByType,
  jsonDecoderNullable,
  JsonValue,
} from "../data/Json";

/**
 * Documentation strings attached to an IDL item.
 * Can be a single string (stored as a one-element array), an array of strings,
 * or `undefined` if no documentation is present.
 */
export type IdlDocs = Array<string> | undefined;

/**
 * Parses documentation from a raw JSON value into the {@link IdlDocs} format.
 * Accepts either a string or an array of strings; returns `undefined` if absent.
 * @param docsValue - The raw JSON value containing the documentation.
 * @returns The parsed documentation, or `undefined` if not present.
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
