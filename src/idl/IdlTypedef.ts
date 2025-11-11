import {
  JsonValue,
  jsonCodecString,
  jsonDecoderAnyOfKind,
  jsonDecoderArray,
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

export const idlTypedefGlobalsByName: ReadonlyMap<string, IdlTypedef> = (() => {
  const typedefs = [
    {
      name: "$Rust",
      docs: undefined,
      repr: "rust",
      serialization: "bytemuck",
      generics: ["T"],
      typeFlat: IdlTypeFlat.generic({ symbol: "T" }),
    },
    {
      name: "$C",
      docs: undefined,
      repr: "c",
      serialization: "bytemuck",
      generics: ["T"],
      typeFlat: IdlTypeFlat.generic({ symbol: "T" }),
    },
  ];
  const typedefsByName = new Map<string, IdlTypedef>();
  for (const typedef of typedefs) {
    typedefsByName.set(typedef.name, typedef);
  }
  return typedefsByName;
})();

const jsonDecoder = jsonDecoderObject({
  docs: idlDocsParse,
  repr: jsonDecoderOptional(stringOrObjectKeyJsonDecoder("kind")),
  serialization: jsonDecoderOptional(jsonCodecString.decoder),
  generics: jsonDecoderOptional(
    jsonDecoderArray(stringOrObjectKeyJsonDecoder("name")),
  ),
});

function stringOrObjectKeyJsonDecoder(objectKey: string) {
  return jsonDecoderAnyOfKind({
    string: (string) => string,
    object: jsonDecoderObjectKey(objectKey, jsonCodecString.decoder),
  });
}
