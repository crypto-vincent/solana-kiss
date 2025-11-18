import {
  jsonCodecString,
  jsonDecoderArray,
  jsonDecoderByType,
  jsonDecoderNullable,
  JsonValue,
} from "../data/Json";

export type IdlDocs = Array<string> | undefined;

export function idlDocsParse(docsValue: JsonValue | undefined): IdlDocs {
  return jsonDecoder(docsValue) ?? undefined;
}

const jsonDecoder = jsonDecoderNullable(
  jsonDecoderByType({
    string: (string: string) => [string],
    array: jsonDecoderArray(jsonCodecString.decoder),
  }),
);
