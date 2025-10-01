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
} from "../data/json";
import { IdlTypeFlat } from "./IdlTypeFlat";
import { idlTypeFlatParseValue } from "./IdlTypeFlat.parse";

export type IdlTypedef = {
  readonly name: string;
  readonly docs: JsonValue;
  readonly serialization: string | undefined;
  readonly repr: string | undefined;
  readonly generics: Array<string>;
  readonly typeFlat: IdlTypeFlat;
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
    typeFlat: idlTypeFlatParseValue(typedefValue),
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
