import { expect, it } from "@jest/globals";
import {
  blockHashFromBytes,
  blockSlotFromNumber,
  casingLosslessConvertToCamel,
  casingLosslessConvertToSnake,
  JsonCodec,
  jsonCodecArray,
  jsonCodecArrayToObject,
  jsonCodecArrayToTuple,
  jsonCodecBlockHash,
  jsonCodecBlockSlot,
  jsonCodecBoolean,
  jsonCodecConst,
  jsonCodecDateTime,
  jsonCodecInteger,
  jsonCodecNullable,
  jsonCodecNumber,
  jsonCodecObject,
  jsonCodecObjectToEnum,
  jsonCodecObjectToMap,
  jsonCodecPubkey,
  jsonCodecSignature,
  jsonCodecString,
  JsonValue,
  pubkeyFromBase58,
  pubkeyNewDummy,
  pubkeyToBase58,
  signatureFromBytes,
} from "../src";

it("run", async () => {
  const tests: Array<{
    encoded: JsonValue;
    codec: JsonCodec<any>;
    decoded: any;
  }> = [
    {
      encoded: { helloWorld: 1 },
      codec: jsonCodecObject({ helloWorld: jsonCodecNumber }),
      decoded: { helloWorld: 1 },
    },
    {
      encoded: { helloWorld: 2 },
      codec: jsonCodecObject({ helloWorld: jsonCodecNumber }, {}),
      decoded: { helloWorld: 2 },
    },
    {
      encoded: { hello_world: 3 },
      codec: jsonCodecObject(
        { helloWorld: jsonCodecNumber },
        { keysEncoding: casingLosslessConvertToSnake },
      ),
      decoded: { helloWorld: 3 },
    },
    {
      encoded: { helloWorld: 4 },
      codec: jsonCodecObject(
        { hello_world: jsonCodecNumber },
        { keysEncoding: casingLosslessConvertToCamel },
      ),
      decoded: { hello_world: 4 },
    },
    {
      encoded: { encoded_key: 5 },
      codec: jsonCodecObject(
        { decodedKey: jsonCodecNumber },
        { keysEncoding: { decodedKey: "encoded_key" } },
      ),
      decoded: { decodedKey: 5 },
    },
    {
      encoded: [6, 7],
      codec: jsonCodecArray(jsonCodecNumber),
      decoded: [6, 7],
    },
    {
      encoded: [null, "Hello", null],
      codec: jsonCodecArray(jsonCodecNullable(jsonCodecString)),
      decoded: [null, "Hello", null],
    },
    {
      encoded: { const: 8, nullables: [null, true, false, null] },
      codec: jsonCodecObject({
        const: jsonCodecConst(8),
        nullables: jsonCodecArray(jsonCodecNullable(jsonCodecBoolean)),
      }),
      decoded: { const: 8, nullables: [null, true, false, null] },
    },
    {
      encoded: {
        datetime: now.toISOString(),
        pubkey: address.toString(),
        signature: signature.toString(),
        blockHash: blockHash.toString(),
        blockSlot: 9,
      },
      codec: jsonCodecObject({
        datetime: jsonCodecDateTime,
        pubkey: jsonCodecPubkey,
        signature: jsonCodecSignature,
        blockHash: jsonCodecBlockHash,
        blockSlot: jsonCodecBlockSlot,
      }),
      decoded: {
        datetime: now,
        pubkey: address,
        signature,
        blockHash,
        blockSlot: blockSlotFromNumber(9),
      },
    },
    {
      encoded: { integer1: "-42", integer2: "4242424242424242424242424242" },
      codec: jsonCodecObject({
        integer1: jsonCodecInteger,
        integer2: jsonCodecInteger,
      }),
      decoded: { integer1: -42n, integer2: 4242424242424242424242424242n },
    },
    {
      encoded: { outer: { inner: { value: 10 } } },
      codec: jsonCodecObject({
        outer: jsonCodecObject({
          inner: jsonCodecObject({ value: jsonCodecNumber }),
        }),
      }),
      decoded: { outer: { inner: { value: 10 } } },
    },
    {
      encoded: { [address.toString()]: 11 },
      codec: jsonCodecObjectToMap({
        keyCodec: {
          encoder: pubkeyToBase58,
          decoder: pubkeyFromBase58,
        },
        valueCodec: jsonCodecNumber,
      }),
      decoded: new Map([[address, 11]]),
    },
    {
      encoded: { toString: 12, constructor: null },
      codec: jsonCodecObject({
        constructor: jsonCodecNullable(jsonCodecNumber),
        toString: jsonCodecNullable(jsonCodecNumber),
      }),
      decoded: { toString: 12, constructor: null },
    },
    {
      encoded: [13, null],
      codec: jsonCodecArrayToObject({
        constructor: jsonCodecNullable(jsonCodecNumber),
        toString: jsonCodecNullable(jsonCodecNumber),
      }),
      decoded: { constructor: 13, toString: null },
    },
    {
      encoded: { constructor: 14, toString: null },
      codec: jsonCodecObjectToMap<string, number | null>({
        keyCodec: {
          encoder: (key) => key,
          decoder: (key) => key,
        },
        valueCodec: jsonCodecNullable(jsonCodecNumber),
      }),
      decoded: new Map<string, number | null>([
        ["constructor", 14],
        ["toString", null],
      ]),
    },
    {
      encoded: [1, "hello", { nested: "world" }],
      codec: jsonCodecArrayToObject({
        0: jsonCodecNumber,
        1: jsonCodecString,
        2: jsonCodecObject({ nested: jsonCodecString }),
      }),
      decoded: { 0: 1, 1: "hello", 2: { nested: "world" } },
    },
    {
      encoded: [42, "hello", { nested: "world" }],
      codec: jsonCodecArrayToTuple([
        jsonCodecNumber,
        jsonCodecString,
        jsonCodecObject({ nested: jsonCodecString }),
      ]),
      decoded: [42, "hello", { nested: "world" }],
    },
    {
      encoded: { case1: "100" },
      codec: jsonCodecObjectToEnum({
        case1: jsonCodecInteger,
        case2: jsonCodecString,
      }),
      decoded: { case1: 100n },
    },
    {
      encoded: { case2: { hello: "world" } },
      codec: jsonCodecObjectToEnum({
        constructor: jsonCodecInteger,
        case2: jsonCodecObject({
          hello: jsonCodecString,
        }),
        toString: jsonCodecBoolean,
      }),
      decoded: { case2: { hello: "world" } },
    },
    {
      encoded: ["dudu", 42],
      codec: jsonCodecArray(jsonCodecConst("dudu", 42, true)),
      decoded: ["dudu", 42],
    },
  ];
  for (const test of tests) {
    expect(test.codec.decoder(test.encoded)).toStrictEqual(test.decoded);
    expect(test.codec.encoder(test.decoded)).toStrictEqual(test.encoded);
  }
});

const now = new Date();
const address = pubkeyNewDummy();
const signature = signatureFromBytes(new Uint8Array(64).fill(42));
const blockHash = blockHashFromBytes(new Uint8Array(32).fill(24));
