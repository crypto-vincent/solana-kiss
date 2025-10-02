import {
  jsonDecoderArray,
  jsonDecoderByKind,
  jsonDecoderMap,
  jsonDecoderObject,
  jsonDecoderOptional,
  jsonDecodeString,
  jsonDecodeValue,
  JsonValue,
} from "../data/Json";
import { IdlTypeFlat } from "./IdlTypeFlat";
import { idlTypeFlatDecode } from "./IdlTypeFlatDecode";

export type IdlTypedef = {
  name: string;
  docs: JsonValue;
  serialization: string | undefined;
  repr: string | undefined;
  generics: Array<string>;
  typeFlat: IdlTypeFlat;
};

export const idlTypedefDecode = jsonDecoderObject({
  docs: jsonDecodeValue,
  serialization: jsonDecoderOptional(jsonDecodeString),
  repr: jsonDecoderOptional(
    jsonDecoderByKind({
      string: (string: string) => string,
      object: jsonDecoderMap(
        jsonDecoderObject({ kind: jsonDecoderOptional(jsonDecodeString) }),
        (repr) => repr?.kind,
      ),
    }),
  ),
  generics: jsonDecoderMap(
    jsonDecoderArray(
      jsonDecoderByKind({
        string: (string: string) => string,
        object: jsonDecoderMap(
          jsonDecoderObject({ name: jsonDecodeString }),
          (repr) => repr.name,
        ),
      }),
    ),
    (array) => array ?? [],
  ),
  typeFlat: idlTypeFlatDecode,
});
