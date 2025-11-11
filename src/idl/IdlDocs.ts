import {
  jsonCodecString,
  jsonDecoderAnyOfKind,
  jsonDecoderArray,
  jsonDecoderOptional,
  JsonValue,
} from "../data/Json";

export type IdlDocs = Array<string> | undefined;

export function idlDocsParse(docsValue: JsonValue | undefined): IdlDocs {
  return jsonDecoder(docsValue);
}

const jsonDecoder = jsonDecoderOptional(
  jsonDecoderAnyOfKind({
    string: (string: string) => [string],
    array: jsonDecoderArray(jsonCodecString.decoder),
  }),
);
