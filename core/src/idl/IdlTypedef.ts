import {
  jsonDecoderArray,
  jsonDecoderObject,
  jsonDecoderOptional,
  jsonDecoderWithDecodeFallbacks,
  jsonDecoderWithDefault,
  jsonDecodeString,
  jsonDecodeValue,
  jsonExpectString,
  JsonValue,
} from "../data/Json";
import { idlDecoderFlatParse } from "./IdlDecoderFlatParse";
import { IdlTypeFlat } from "./IdlTypeFlat";

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
  const typedefInfo = typedefDecode(typedefValue);
  return {
    name: typedefName,
    docs: typedefInfo.docs,
    serialization: typedefInfo.serialization,
    repr: typedefInfo.repr?.kind,
    generics: typedefInfo.generics.map((generic) => generic.name),
    typeFlat: idlDecoderFlatParse(typedefValue),
  };
}

const typedefDecode = jsonDecoderObject({
  docs: jsonDecodeValue,
  serialization: jsonDecoderOptional(jsonDecodeString),
  repr: jsonDecoderOptional(
    jsonDecoderWithDecodeFallbacks(
      jsonDecoderObject({ kind: jsonDecodeString }),
      [(value: JsonValue) => ({ kind: jsonExpectString(value) })],
    ),
  ),
  generics: jsonDecoderWithDefault(
    jsonDecoderArray(
      jsonDecoderWithDecodeFallbacks(
        jsonDecoderObject({ name: jsonDecodeString }),
        [(value: JsonValue) => ({ name: jsonExpectString(value) })],
      ),
    ),
    () => [],
  ),
});
