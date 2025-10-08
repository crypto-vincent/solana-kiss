import { expect, it } from "@jest/globals";
import {
  jsonCodecInteger,
  jsonCodecNumber,
  JsonDecoder,
  jsonDecoderByKind,
  jsonDecoderForked,
  jsonDecoderObject,
  jsonDecoderObjectToMap,
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
        outer: jsonDecoderObject({
          inner: jsonCodecInteger.decoder,
        }),
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
  ];
  for (const test of tests) {
    expect(test.decoder(test.encoded)).toStrictEqual(test.decoded);
  }
});
