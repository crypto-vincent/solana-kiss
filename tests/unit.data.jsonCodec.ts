import { expect, it } from "@jest/globals";
import {
  blockHashFromBytes,
  blockSlotFromNumber,
  casingConvertToCamel,
  casingConvertToSnake,
  JsonCodec,
  jsonCodecArray,
  jsonCodecBlockHash,
  jsonCodecBlockSlot,
  jsonCodecBoolean,
  jsonCodecConst,
  jsonCodecDateTime,
  jsonCodecInteger,
  jsonCodecNullable,
  jsonCodecNumber,
  jsonCodecObject,
  jsonCodecObjectKey,
  jsonCodecObjectToMap,
  jsonCodecOptional,
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
      encoded: { helloWorld: 42 },
      codec: jsonCodecObject({ helloWorld: jsonCodecNumber }),
      decoded: { helloWorld: 42 },
    },
    {
      encoded: { helloWorld: 42 },
      codec: jsonCodecObject({ helloWorld: jsonCodecNumber }, {}),
      decoded: { helloWorld: 42 },
    },
    {
      encoded: { hello_world: 42 },
      codec: jsonCodecObject(
        { helloWorld: jsonCodecNumber },
        casingConvertToSnake,
      ),
      decoded: { helloWorld: 42 },
    },
    {
      encoded: { helloWorld: 42 },
      codec: jsonCodecObject(
        { hello_world: jsonCodecNumber },
        casingConvertToCamel,
      ),
      decoded: { hello_world: 42 },
    },
    {
      encoded: { encoded_key: 42 },
      codec: jsonCodecObject(
        { decodedKey: jsonCodecNumber },
        { decodedKey: "encoded_key" },
      ),
      decoded: { decodedKey: 42 },
    },
    {
      encoded: [42, 43],
      codec: jsonCodecArray(jsonCodecNumber),
      decoded: [42, 43],
    },
    {
      encoded: [undefined, "Hello", undefined],
      codec: jsonCodecArray(jsonCodecOptional(jsonCodecString)),
      decoded: [undefined, "Hello", undefined],
    },
    {
      encoded: { const: 42, nullables: [null, true, false, null] },
      codec: jsonCodecObject({
        const: jsonCodecConst(42),
        nullables: jsonCodecArray(jsonCodecNullable(jsonCodecBoolean)),
      }),
      decoded: { const: 42, nullables: [null, true, false, null] },
    },
    {
      encoded: { keyed: { value: "Hello" } },
      codec: jsonCodecObjectKey(
        "keyed",
        jsonCodecObjectKey("value", jsonCodecString),
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
        blockSlot: blockSlotFromNumber(42),
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
      encoded: { outer: { inner: { value: 42 } } },
      codec: jsonCodecObject({
        outer: jsonCodecObject({
          inner: jsonCodecObject({ value: jsonCodecNumber }),
        }),
      }),
      decoded: { outer: { inner: { value: 42 } } },
    },
    {
      encoded: { [address.toString()]: 42 },
      codec: jsonCodecObjectToMap(
        {
          keyEncoder: pubkeyToBase58,
          keyDecoder: pubkeyFromBase58,
        },
        jsonCodecNumber,
      ),
      decoded: new Map([[address, 42]]),
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
