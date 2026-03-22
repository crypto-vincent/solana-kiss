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

/** Parsed IDL type definition. */
export type IdlTypedef = {
  /** camelCase typedef name. */
  name: string;
  /** Documentation strings, or `undefined`. */
  docs: IdlDocs;
  /** Memory repr hint (`"rust"`, `"c"`), or `undefined`. */
  repr: string | undefined;
  /** Serialization format override, or `undefined` for Borsh. */
  serialization: string | undefined;
  /** Ordered generic type parameter names. */
  generics: Array<string>;
  /** Unresolved flat type representation. */
  typeFlat: IdlTypeFlat;
};

/**
 * Parses an IDL typedef from its raw JSON representation.
 * @param typedefName - Typedef name.
 * @param typedefValue - Raw JSON value.
 * @returns Parsed {@link IdlTypedef}.
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

/** Read-only map of built-in global typedef definitions (e.g. `$Rust`, `$C`). */
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
