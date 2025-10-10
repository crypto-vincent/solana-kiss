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
  repr: string | undefined;
  serialization: string | undefined;
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
    repr: decoded.repr,
    serialization: decoded.serialization,
    generics: decoded.generics ?? [],
    typeFlat: idlTypeFlatParse(typedefValue),
  };
}

const jsonDecoder = jsonDecoderObject({
  docs: idlDocsParse,
  repr: jsonDecoderOptional(stringOrObjectKeyJsonDecoder("kind")),
  serialization: jsonDecoderOptional(jsonCodecString.decoder),
  generics: jsonDecoderOptional(
    jsonDecoderArray(stringOrObjectKeyJsonDecoder("name")),
  ),
});

function stringOrObjectKeyJsonDecoder(objectKey: string) {
  return jsonDecoderByKind({
    string: (string) => string,
    object: jsonDecoderObjectKey(objectKey, jsonCodecString.decoder),
  });
}
