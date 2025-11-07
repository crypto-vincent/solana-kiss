import { expect, it } from "@jest/globals";
import {
  jsonCodecBytesBase16,
  jsonCodecInteger,
  jsonCodecNumber,
  JsonDecoder,
  jsonDecoderByKind,
  jsonDecoderForked,
  jsonDecoderObject,
  jsonDecoderObjectToMap,
  jsonDecoderOptional,
  jsonDecoderTransform,
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
      decoder: jsonDecoderTransform(
        jsonDecoderForked([jsonCodecNumber.decoder, jsonCodecInteger.decoder]),
        ([num, int]) => ({ num, int }),
      ),
      decoded: { num: 42, int: 42n },
    },
    {
      encoded: { a: null, b: 42, c: "hello" },
      decoder: jsonDecoderObjectToMap({
        keyDecoder: (name) => `key:${name}`,
        valueDecoder: jsonDecoderByKind({
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
        snakeCase: jsonDecoderOptional(jsonCodecNumber.decoder),
        camelCase: jsonDecoderOptional(jsonCodecNumber.decoder),
      }),
      decoded: { snakeCase: 142, camelCase: 143 },
    },
    {
      encoded: { snake_case: 342, camelCase: 343 },
      decoder: jsonDecoderObject(
        {
          snakeCase: jsonDecoderOptional(jsonCodecNumber.decoder),
          camelCase: jsonDecoderOptional(jsonCodecNumber.decoder),
        },
        { keysSkipSnakeCaseFallback: true },
      ),
      decoded: { camelCase: 343 },
    },
  ];
  for (const test of tests) {
    expect(test.decoder(test.encoded)).toStrictEqual(test.decoded);
  }
});
