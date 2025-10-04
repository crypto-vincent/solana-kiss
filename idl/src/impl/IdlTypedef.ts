import {
  JsonValue,
  jsonDecoderArray,
  jsonDecoderByKind,
  jsonDecoderObject,
  jsonDecoderOptional,
  jsonTypeString,
  jsonTypeValue,
} from "solana-kiss-data";
import { IdlTypeFlat } from "./IdlTypeFlat";
import { idlTypeFlatParse } from "./IdlTypeFlatParse";

export type IdlTypedef = {
  name: string;
  docs: JsonValue;
  serialization: string | undefined;
  repr: string | undefined;
  generics: Array<string>;
  typeFlat: IdlTypeFlat;
};

export function idlTypedefParse(
  typedefName: string,
  typedefValue: JsonValue,
): IdlTypedef {
  const info = infoJsonDecode(typedefValue);
  return {
    name: typedefName,
    docs: info.docs,
    serialization: info.serialization,
    repr: info.repr?.kind,
    generics: (info.generics ?? []).map((generic) => generic.name),
    typeFlat: idlTypeFlatParse(typedefValue),
  };
}

const infoJsonDecode = jsonDecoderObject({
  docs: jsonTypeValue.decode,
  serialization: jsonDecoderOptional(jsonTypeString.decode),
  repr: jsonDecoderOptional(
    jsonDecoderByKind({
      string: (string: string) => ({ kind: string }),
      object: jsonDecoderObject({ kind: jsonTypeString.decode }),
    }),
  ),
  generics: jsonDecoderOptional(
    jsonDecoderArray(
      jsonDecoderByKind({
        string: (string: string) => ({ name: string }),
        object: jsonDecoderObject({ name: jsonTypeString.decode }),
      }),
    ),
  ),
});
