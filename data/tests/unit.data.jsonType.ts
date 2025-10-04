import { expect, it } from "@jest/globals";
import {
  casingKeyedCamelToSnake,
  casingKeyedSnakeToCamel,
  JsonType,
  jsonTypeArray,
  jsonTypeBoolean,
  jsonTypeConst,
  jsonTypeDateTime,
  jsonTypeNullable,
  jsonTypeNumber,
  jsonTypeObject,
  jsonTypeObjectKey,
  jsonTypeOptional,
  jsonTypeRemap,
  jsonTypeString,
  JsonValue,
} from "../src";

it("run", async () => {
  const tests: Array<{
    encoded: JsonValue;
    type: JsonType<any>;
    decoded: any;
  }> = [
    {
      encoded: {
        key: "Hello World",
      },
      type: jsonTypeObject({
        key: jsonTypeString,
      }),
      decoded: {
        key: "Hello World",
      },
    },
    {
      encoded: [42, 43],
      type: jsonTypeArray(jsonTypeNumber),
      decoded: [42, 43],
    },
    {
      encoded: [undefined, "Hello", undefined],
      type: jsonTypeArray(jsonTypeOptional(jsonTypeString)),
      decoded: [undefined, "Hello", undefined],
    },
    {
      encoded: {
        encoded_key: 42,
      },
      type: jsonTypeObject(
        { decodedKey: jsonTypeNumber },
        { decodedKey: "encoded_key" },
      ),
      decoded: {
        decodedKey: 42,
      },
    },
    {
      encoded: {
        my_value_v1: 42,
      },
      type: jsonTypeRemap(
        jsonTypeObject({ my_value_v1: jsonTypeNumber }),
        casingKeyedSnakeToCamel,
        casingKeyedCamelToSnake,
      ),
      decoded: {
        myValueV1: 42,
      },
    },
    {
      encoded: {
        const: 42,
        nullables: [null, true, false, null],
      },
      type: jsonTypeObject({
        const: jsonTypeConst(42),
        nullables: jsonTypeArray(jsonTypeNullable(jsonTypeBoolean)),
      }),
      decoded: {
        const: 42,
        nullables: [null, true, false, null],
      },
    },
    {
      encoded: {
        keyed: {
          value: "Hello",
        },
      },
      type: jsonTypeObjectKey(
        "keyed",
        jsonTypeObjectKey("value", jsonTypeString),
      ),
      decoded: "Hello",
    },
    {
      encoded: {
        now: now.toISOString(),
      },
      type: jsonTypeObject({
        now: jsonTypeDateTime,
      }),
      decoded: { now },
    },
  ];
  for (const test of tests) {
    expect(test.type.decoder(test.encoded)).toStrictEqual(test.decoded);
    expect(test.type.encoder(test.decoded)).toStrictEqual(test.encoded);
  }
});

const now = new Date();
