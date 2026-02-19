import {
  JsonValue,
  jsonCodecString,
  jsonDecoderArrayToArray,
  jsonDecoderByType,
  jsonDecoderNullable,
  jsonDecoderObjectToObject,
  jsonDecoderWrapped,
} from "../data/Json";
import { IdlDocs, idlDocsParse } from "./IdlDocs";
import { IdlTypeFlat } from "./IdlTypeFlat";
import { idlTypeFlatParse } from "./IdlTypeFlatParse";

/**
 * Represents a parsed IDL type definition, including its name, type layout,
 * optional repr and serialization overrides, and generic parameters.
 */
export type IdlTypedef = {
  name: string;
  docs: IdlDocs;
  repr: string | undefined;
  serialization: string | undefined;
  generics: Array<string>;
  typeFlat: IdlTypeFlat;
};

/**
 * Parses an IDL typedef definition from its raw JSON representation.
 * @param typedefName - The name of the typedef.
 * @param typedefValue - The raw JSON value describing the typedef.
 * @returns The parsed {@link IdlTypedef}.
 */
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

/**
 * A read-only map of built-in global typedef definitions keyed by name.
 * Includes synthetic types such as `$Rust` and `$C` used to represent
 * Rust and C memory layout overrides for bytemuck-serialized structs.
 */
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

const jsonDecoder = jsonDecoderObjectToObject({
  docs: idlDocsParse,
  repr: jsonDecoderNullable(stringOrObjectKeyJsonDecoder("kind")),
  serialization: jsonDecoderNullable(jsonCodecString.decoder),
  generics: jsonDecoderNullable(
    jsonDecoderArrayToArray(stringOrObjectKeyJsonDecoder("name")),
  ),
});

function stringOrObjectKeyJsonDecoder(objectKey: string) {
  return jsonDecoderByType({
    string: (string) => string,
    object: jsonDecoderWrapped(
      jsonDecoderObjectToObject({ [objectKey]: jsonCodecString.decoder }),
      ({ [objectKey]: value }) => value!,
    ),
  });
}
