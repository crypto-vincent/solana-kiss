import {
  jsonExpectString,
  jsonTypeArray,
  jsonTypeObject,
  jsonTypeOptional,
  jsonTypeString,
  jsonTypeValue,
  jsonTypeWithDecodeFallbacks,
  jsonTypeWithDefault,
  JsonValue,
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
  const typedefInfo = typedefJsonType.decode(typedefValue);
  return {
    name: typedefName,
    docs: typedefInfo.docs,
    serialization: typedefInfo.serialization,
    repr: typedefInfo.repr?.kind,
    generics: typedefInfo.generics.map((generic) => generic.name),
    typeFlat: idlTypeFlatParse(typedefValue),
  };
}

const typedefJsonType = jsonTypeObject({
  docs: jsonTypeValue(),
  serialization: jsonTypeOptional(jsonTypeString()),
  repr: jsonTypeOptional(
    jsonTypeWithDecodeFallbacks(jsonTypeObject({ kind: jsonTypeString() }), [
      (value: JsonValue) => ({ kind: jsonExpectString(value) }),
    ]),
  ),
  generics: jsonTypeWithDefault(
    jsonTypeArray(
      jsonTypeWithDecodeFallbacks(jsonTypeObject({ name: jsonTypeString() }), [
        (value: JsonValue) => ({ name: jsonExpectString(value) }),
      ]),
    ),
    () => [],
  ),
});
