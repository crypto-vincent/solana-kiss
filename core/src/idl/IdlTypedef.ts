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
import { IdlTypeFlat } from "./idlTypeFlat";
import { idlTypeFlatParse } from "./IdlTypeFlat.parse";

export type IdlTypedef = {
  readonly name: string;
  readonly docs: any;
  readonly serialization: string | undefined;
  readonly repr: string | undefined;
  readonly generics: Array<string>;
  readonly typeFlat: IdlTypeFlat;
};

export function idlTypedefParse(
  typedefName: string,
  typedefJson: JsonValue,
): IdlTypedef {
  const typedefInfo = typedefJsonType.decode(typedefJson);
  return {
    name: typedefName,
    docs: typedefInfo.docs,
    serialization: typedefInfo.serialization,
    repr: typedefInfo.repr?.kind,
    generics: typedefInfo.generics.map((generic) => generic.name),
    typeFlat: idlTypeFlatParse(typedefJson),
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
