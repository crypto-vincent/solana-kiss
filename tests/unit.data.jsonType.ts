import { expect, it } from "@jest/globals";
import {
  blockHashFromBytes,
  blockSlotFromNumber,
  casingCamelToSnake,
  casingSnakeToCamel,
  JsonType,
  jsonTypeArray,
  jsonTypeBlockHash,
  jsonTypeBlockSlot,
  jsonTypeBoolean,
  jsonTypeConst,
  jsonTypeDateTime,
  jsonTypeInteger,
  jsonTypeNullable,
  jsonTypeNumber,
  jsonTypeObject,
  jsonTypeObjectKey,
  jsonTypeObjectToMap,
  jsonTypeOptional,
  jsonTypePubkey,
  jsonTypeSignature,
  jsonTypeString,
  JsonValue,
  pubkeyFromBase58,
  pubkeyNewDummy,
  pubkeyToBase58,
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
      type: jsonTypeObject({ helloWorld: jsonTypeNumber }),
      decoded: { helloWorld: 42 },
    },
    {
      encoded: { helloWorld: 42 },
      type: jsonTypeObject({ helloWorld: jsonTypeNumber }, {}),
      decoded: { helloWorld: 42 },
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
        blockHash: blockHash.toString(),
        blockSlot: 42,
      },
      type: jsonTypeObject({
        datetime: jsonTypeDateTime,
        pubkey: jsonTypePubkey,
        signature: jsonTypeSignature,
        blockHash: jsonTypeBlockHash,
        blockSlot: jsonTypeBlockSlot,
      }),
      decoded: {
        datetime: now,
        pubkey: address,
        signature,
        blockHash,
        blockSlot: blockSlotFromNumber(42),
      },
    },
    {
      encoded: { integer1: "-42", integer2: "4242424242424242424242424242" },
      type: jsonTypeObject({
        integer1: jsonTypeInteger,
        integer2: jsonTypeInteger,
      }),
      decoded: { integer1: -42n, integer2: 4242424242424242424242424242n },
    },
    {
      encoded: { outer: { inner: { value: 42 } } },
      type: jsonTypeObject({
        outer: jsonTypeObject({
          inner: jsonTypeObject({ value: jsonTypeNumber }),
        }),
      }),
      decoded: { outer: { inner: { value: 42 } } },
    },
    {
      encoded: { [address.toString()]: 42 },
      type: jsonTypeObjectToMap(
        {
          keyEncoder: pubkeyToBase58,
          keyDecoder: pubkeyFromBase58,
        },
        jsonTypeNumber,
      ),
      decoded: new Map([[address, 42]]),
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
const blockHash = blockHashFromBytes(new Uint8Array(32).fill(24));
