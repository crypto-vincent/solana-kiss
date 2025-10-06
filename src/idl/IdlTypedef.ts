import {
  JsonValue,
  jsonDecoderArray,
  jsonDecoderByKind,
  jsonDecoderObject,
  jsonDecoderOptional,
  jsonTypeString,
  jsonTypeValue,
} from "../data/Json";
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
  const info = infoJsonDecoder(typedefValue);
  return {
    name: typedefName,
    docs: info.docs,
    serialization: info.serialization,
    repr: info.repr?.kind,
    generics: (info.generics ?? []).map((generic) => generic.name),
    typeFlat: idlTypeFlatParse(typedefValue),
  };
}

const infoJsonDecoder = jsonDecoderObject((key) => key, {
  docs: jsonTypeValue.decoder,
  serialization: jsonDecoderOptional(jsonTypeString.decoder),
  repr: jsonDecoderOptional(
    jsonDecoderByKind({
      string: (string: string) => ({ kind: string }),
      object: jsonDecoderObject((key) => key, { kind: jsonTypeString.decoder }),
    }),
  ),
  generics: jsonDecoderOptional(
    jsonDecoderArray(
      jsonDecoderByKind({
        string: (string: string) => ({ name: string }),
        object: jsonDecoderObject((key) => key, {
          name: jsonTypeString.decoder,
        }),
      }),
    ),
  ),
});
