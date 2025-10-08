import {
  jsonCodecString,
  jsonDecoderArray,
  jsonDecoderByKind,
  jsonDecoderOptional,
  JsonValue,
} from "../data/Json";

export type IdlDocs = Array<string> | undefined;

export function idlDocsParse(docsValue: JsonValue): IdlDocs {
  return jsonDecoder(docsValue);
}

const jsonDecoder = jsonDecoderOptional(
  jsonDecoderByKind({
    string: (string: string) => [string],
    array: jsonDecoderArray(jsonCodecString.decoder),
  }),
);
