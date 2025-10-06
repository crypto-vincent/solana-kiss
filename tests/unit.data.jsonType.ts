import { expect, it } from "@jest/globals";
import {
  blockhashFromBytes,
  casingCamelToSnake,
  casingKeyedCamelToSnake,
  casingKeyedSnakeToCamel,
  casingSnakeToCamel,
  JsonType,
  jsonTypeArray,
  jsonTypeBlockhash,
  jsonTypeBoolean,
  jsonTypeConst,
  jsonTypeDateTime,
  jsonTypeInteger,
  jsonTypeNullable,
  jsonTypeNumber,
  jsonTypeObject,
  jsonTypeObjectKey,
  jsonTypeOptional,
  jsonTypePubkey,
  jsonTypeRemap,
  jsonTypeSignature,
  jsonTypeString,
  JsonValue,
  pubkeyNewDummy,
  signatureFromBytes,
} from "../src";

it("run", async () => {
  const tests: Array<{
    encoded: JsonValue;
    type: JsonType<any>;
    decoded: any;
  }> = [
    {
      encoded: { helloWorld: 42 },
      type: jsonTypeObject((key) => key, { helloWorld: jsonTypeNumber }),
      decoded: { helloWorld: 42 },
    },
    {
      encoded: { helloWorld: 42 },
      type: jsonTypeObject({}, { helloWorld: jsonTypeNumber }),
      decoded: { helloWorld: 42 },
    },
    {
      encoded: { hello_world: 42 },
      type: jsonTypeObject(casingCamelToSnake, { helloWorld: jsonTypeNumber }),
      decoded: { helloWorld: 42 },
    },
    {
      encoded: { helloWorld: 42 },
      type: jsonTypeObject(casingSnakeToCamel, { hello_world: jsonTypeNumber }),
      decoded: { hello_world: 42 },
    },
    {
      encoded: { encoded_key: 42 },
      type: jsonTypeObject(
        { decodedKey: "encoded_key" },
        { decodedKey: jsonTypeNumber },
      ),
      decoded: { decodedKey: 42 },
    },
    {
      encoded: { my_value_v1: 42 },
      type: jsonTypeRemap(
        jsonTypeObject(casingCamelToSnake, { myValueV1: jsonTypeNumber }),
        casingKeyedCamelToSnake,
        casingKeyedSnakeToCamel,
      ),
      decoded: { my_value_v1: 42 },
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
      encoded: { const: 42, nullables: [null, true, false, null] },
      type: jsonTypeObject((key) => key, {
        const: jsonTypeConst(42),
        nullables: jsonTypeArray(jsonTypeNullable(jsonTypeBoolean)),
      }),
      decoded: { const: 42, nullables: [null, true, false, null] },
    },
    {
      encoded: { keyed: { value: "Hello" } },
      type: jsonTypeObjectKey(
        "keyed",
        jsonTypeObjectKey("value", jsonTypeString),
      ),
      decoded: "Hello",
    },
    {
      encoded: {
        datetime: now.toISOString(),
        pubkey: address.toString(),
        signature: signature.toString(),
        blockhash: blockhash.toString(),
      },
      type: jsonTypeObject((key) => key, {
        datetime: jsonTypeDateTime,
        pubkey: jsonTypePubkey,
        signature: jsonTypeSignature,
        blockhash: jsonTypeBlockhash,
      }),
      decoded: { datetime: now, pubkey: address, signature, blockhash },
    },
    {
      encoded: { integer1: "-42", integer2: "4242424242424242424242424242" },
      type: jsonTypeObject((key) => key, {
        integer1: jsonTypeInteger,
        integer2: jsonTypeInteger,
      }),
      decoded: { integer1: -42n, integer2: 4242424242424242424242424242n },
    },
    {
      encoded: { outer: { inner: { value: 42 } } },
      type: jsonTypeObject((key) => key, {
        outer: jsonTypeObject((key) => key, {
          inner: jsonTypeObject((key) => key, { value: jsonTypeNumber }),
        }),
      }),
      decoded: { outer: { inner: { value: 42 } } },
    },
  ];
  for (const test of tests) {
    expect(test.type.decoder(test.encoded)).toStrictEqual(test.decoded);
    expect(test.type.encoder(test.decoded)).toStrictEqual(test.encoded);
  }
});

const now = new Date();
const address = pubkeyNewDummy();
const signature = signatureFromBytes(new Uint8Array(64).fill(42));
const blockhash = blockhashFromBytes(new Uint8Array(32).fill(24));
