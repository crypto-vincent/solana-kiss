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
      encoded: { key_value: "Hello World" },
      type: jsonTypeObject({ keyValue: jsonTypeString }),
      decoded: { keyValue: "Hello World" },
    },
    {
      encoded: { keyValue: "Hello World" },
      type: jsonTypeObject({ keyValue: jsonTypeString }, null),
      decoded: { keyValue: "Hello World" },
    },
    {
      encoded: { hello_world: 42 },
      type: jsonTypeObject({ helloWorld: jsonTypeNumber }, casingCamelToSnake),
      decoded: { helloWorld: 42 },
    },
    {
      encoded: { helloWorld: 42 },
      type: jsonTypeObject({ hello_world: jsonTypeNumber }, casingSnakeToCamel),
      decoded: { hello_world: 42 },
    },
    {
      encoded: { encoded_key: 42 },
      type: jsonTypeObject(
        { decodedKey: jsonTypeNumber },
        { decodedKey: "encoded_key" },
      ),
      decoded: { decodedKey: 42 },
    },
    {
      encoded: { my_value_v1: 42 },
      type: jsonTypeRemap(
        jsonTypeObject({ myValueV1: jsonTypeNumber }),
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
      type: jsonTypeObject({
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
      type: jsonTypeObject({
        datetime: jsonTypeDateTime,
        pubkey: jsonTypePubkey,
        signature: jsonTypeSignature,
        blockhash: jsonTypeBlockhash,
      }),
      decoded: { datetime: now, pubkey: address, signature, blockhash },
    },
    {
      encoded: { integer1: "-42", integer2: "4242424242424242424242424242" },
      type: jsonTypeObject({
        integer1: jsonTypeInteger,
        integer2: jsonTypeInteger,
      }),
      decoded: { integer1: -42n, integer2: 4242424242424242424242424242n },
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
