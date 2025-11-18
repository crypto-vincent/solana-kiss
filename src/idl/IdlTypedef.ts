import {
  JsonValue,
  jsonCodecString,
  jsonDecoderArray,
  jsonDecoderByType,
  jsonDecoderNullable,
  jsonDecoderObject,
  jsonDecoderObjectKey,
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
    repr: decoded.repr ?? undefined,
    serialization: decoded.serialization ?? undefined,
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
  repr: jsonDecoderNullable(stringOrObjectKeyJsonDecoder("kind")),
  serialization: jsonDecoderNullable(jsonCodecString.decoder),
  generics: jsonDecoderNullable(
    jsonDecoderArray(stringOrObjectKeyJsonDecoder("name")),
  ),
});

function stringOrObjectKeyJsonDecoder(objectKey: string) {
  return jsonDecoderByType({
    string: (string) => string,
    object: jsonDecoderObjectKey(objectKey, jsonCodecString.decoder),
  });
}
