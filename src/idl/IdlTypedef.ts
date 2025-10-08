import {
  JsonValue,
  jsonCodecString,
  jsonDecoderArray,
  jsonDecoderByKind,
  jsonDecoderObject,
  jsonDecoderObjectKey,
  jsonDecoderOptional,
} from "../data/Json";
import { IdlDocs, idlDocsParse } from "./IdlDocs";
import { IdlTypeFlat } from "./IdlTypeFlat";
import { idlTypeFlatParse } from "./IdlTypeFlatParse";

export type IdlTypedef = {
  name: string;
  docs: IdlDocs;
  serialization: string | undefined;
  repr: string | undefined;
  generics: Array<string>;
  typeFlat: IdlTypeFlat;
};

export function idlTypedefParse(
  typedefName: string,
  typedefValue: JsonValue,
): IdlTypedef {
  const decoded = jsonDecoder(typedefValue);
  return {
    name: typedefName,
    docs: decoded.docs,
    serialization: decoded.serialization,
    repr: decoded.repr,
    generics: decoded.generics ?? [],
    typeFlat: idlTypeFlatParse(typedefValue),
  };
}

const jsonDecoder = jsonDecoderObject({
  docs: idlDocsParse,
  serialization: jsonDecoderOptional(jsonCodecString.decoder),
  repr: jsonDecoderOptional(
    jsonDecoderByKind({
      string: (string) => string,
      object: jsonDecoderObjectKey("kind", jsonCodecString.decoder),
    }),
  ),
  generics: jsonDecoderOptional(
    jsonDecoderArray(
      jsonDecoderByKind({
        string: (string) => string,
        object: jsonDecoderObjectKey("name", jsonCodecString.decoder),
      }),
    ),
  ),
});
