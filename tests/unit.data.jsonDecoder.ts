import { expect, it } from "@jest/globals";
import {
  jsonCodecBytesBase16,
  jsonCodecInteger,
  jsonCodecNumber,
  JsonDecoder,
  jsonDecoderArrayToObject,
  jsonDecoderArrayToTuple,
  jsonDecoderByType,
  jsonDecoderConst,
  jsonDecoderInParallel,
  jsonDecoderNullable,
  jsonDecoderObject,
  jsonDecoderObjectToEnum,
  jsonDecoderObjectToMap,
  JsonValue,
} from "../src";

it("run", async () => {
  const tests: Array<{
    encoded: JsonValue;
    decoder: JsonDecoder<any>;
    decoded: any;
  }> = [
    { encoded: null, decoder: jsonCodecNumber.decoder, decoded: NaN },
    {
      encoded: null,
      decoder: jsonDecoderNullable(jsonCodecNumber.decoder),
      decoded: null,
    },
    {
      encoded: null,
      decoder: jsonDecoderByType({
        null: () => null,
        number: jsonCodecNumber.decoder,
      }),
      decoded: null,
    },
    {
      encoded: "Infinity",
      decoder: jsonCodecNumber.decoder,
      decoded: Infinity,
    },
    {
      encoded: "-Infinity",
      decoder: jsonCodecNumber.decoder,
      decoded: -Infinity,
    },
    { encoded: 42, decoder: jsonCodecInteger.decoder, decoded: 42n },
    { encoded: "-42", decoder: jsonCodecInteger.decoder, decoded: -42n },
    { encoded: "0xff", decoder: jsonCodecInteger.decoder, decoded: 255n },
    { encoded: "0xf_f", decoder: jsonCodecInteger.decoder, decoded: 255n },
    { encoded: "0b1_1", decoder: jsonCodecInteger.decoder, decoded: 3n },
    {
      encoded: { outer: { inner: 42 } },
      decoder: jsonDecoderObject({
        outer: jsonDecoderObject({ inner: jsonCodecInteger.decoder }),
      }),
      decoded: { outer: { inner: 42n } },
    },
    {
      encoded: 42,
      decoder: jsonDecoderInParallel({
        number: jsonCodecNumber.decoder,
        bigint: jsonCodecInteger.decoder,
      }),
      decoded: { number: 42, bigint: 42n },
    },
    {
      encoded: { a: null, b: 42, c: "hello" },
      decoder: jsonDecoderObjectToMap({
        keyDecoder: (name) => `key:${name}`,
        valueDecoder: jsonDecoderByType({
          null: () => "null",
          number: (number) => `number:${number}`,
          string: (string) => `string:${string}`,
        }),
      }),
      decoded: new Map([
        ["key:a", "null"],
        ["key:b", "number:42"],
        ["key:c", "string:hello"],
      ]),
    },
    {
      encoded: { constructor: 14, toString: undefined },
      decoder: jsonDecoderObjectToMap({
        keyDecoder: (key) => key,
        valueDecoder: jsonDecoderNullable(jsonCodecNumber.decoder),
      }),
      decoded: new Map<string, number | undefined>([["constructor", 14]]),
    },
    {
      encoded: { constructor: 12 },
      decoder: jsonDecoderObject({
        constructor: jsonDecoderNullable(jsonCodecNumber.decoder),
        toString: jsonDecoderNullable(jsonCodecNumber.decoder),
      }),
      decoded: { constructor: 12, toString: null },
    },
    {
      encoded: { constructor: 77, toString: undefined },
      decoder: jsonDecoderObject({
        constructor: jsonDecoderNullable(jsonCodecNumber.decoder),
        toString: jsonDecoderNullable(jsonCodecNumber.decoder),
      }),
      decoded: { constructor: 77, toString: null },
    },
    {
      encoded: { lowerBase16: "f2f2", upperBase16: "F2F2" },
      decoder: jsonDecoderObject({
        lowerBase16: jsonCodecBytesBase16.decoder,
        upperBase16: jsonCodecBytesBase16.decoder,
      }),
      decoded: {
        lowerBase16: new Uint8Array([0xf2, 0xf2]),
        upperBase16: new Uint8Array([0xf2, 0xf2]),
      },
    },
    {
      encoded: { snake_case: 142, camelCase: 143 },
      decoder: jsonDecoderObject({
        snakeCase: jsonDecoderNullable(jsonCodecNumber.decoder),
        camelCase: jsonDecoderNullable(jsonCodecNumber.decoder),
      }),
      decoded: { snakeCase: 142, camelCase: 143 },
    },
    {
      encoded: "Case1",
      decoder: jsonDecoderObjectToEnum({
        Case1: jsonDecoderConst(null),
        Case2: jsonDecoderObject({ hello: jsonCodecNumber.decoder }),
      }),
      decoded: { Case1: null },
    },
    {
      encoded: [13],
      decoder: jsonDecoderArrayToObject({
        constructor: jsonCodecNumber.decoder,
        toString: jsonDecoderNullable(jsonCodecNumber.decoder),
      }),
      decoded: { constructor: 13, toString: null },
    },
    {
      encoded: [999],
      decoder: jsonDecoderArrayToTuple([
        jsonCodecNumber.decoder,
        jsonDecoderNullable(jsonCodecNumber.decoder),
      ]),
      decoded: [999, null],
    },
  ];
  for (const test of tests) {
    expect(test.decoder(test.encoded)).toStrictEqual(test.decoded);
  }
});
