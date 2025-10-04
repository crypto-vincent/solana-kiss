import { expect, it } from "@jest/globals";
import {
  JsonType,
  jsonTypeArray,
  jsonTypeBoolean,
  jsonTypeConst,
  jsonTypeNullable,
  jsonTypeNumber,
  jsonTypeObject,
  jsonTypeString,
  JsonValue,
} from "../src";

it("run", async () => {
  const tests: Array<{ data: JsonValue; type: JsonType<any> }> = [
    {
      data: {
        key: "Hello World",
      },
      type: jsonTypeObject({
        key: jsonTypeString,
      }),
    },
    {
      data: [42, 43],
      type: jsonTypeArray(jsonTypeNumber),
    },
    {
      data: [null, "Hello"],
      type: jsonTypeArray(jsonTypeNullable(jsonTypeString)),
    },
    {
      data: {
        encoded_key: 42,
      },
      type: jsonTypeObject(
        { decodedKey: jsonTypeNumber },
        { decodedKey: "encoded_key" },
      ),
    },
    {
      data: {
        const: 42,
        nullables: [null, true, false],
      },
      type: jsonTypeObject({
        const: jsonTypeConst(42),
        nullables: jsonTypeArray(jsonTypeNullable(jsonTypeBoolean)),
      }),
    },
  ];
  for (const test of tests) {
    expect(test.data).toStrictEqual(
      test.type.encoder(test.type.decoder(test.data)),
    );
  }
});
