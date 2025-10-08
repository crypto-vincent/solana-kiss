import { expect, it } from "@jest/globals";
import {
  JsonDecoder,
  jsonDecoderByKind,
  jsonDecoderObject,
  jsonDecoderObjectToMap,
  jsonDecoderSplit,
  jsonDecoderTransform,
  jsonTypeInteger,
  jsonTypeNumber,
  JsonValue,
} from "../src";

it("run", async () => {
  const tests: Array<{
    encoded: JsonValue;
    decoder: JsonDecoder<any>;
    decoded: any;
  }> = [
    { encoded: null, decoder: jsonTypeNumber.decoder, decoded: NaN },
    { encoded: "Infinity", decoder: jsonTypeNumber.decoder, decoded: Infinity },
    {
      encoded: "-Infinity",
      decoder: jsonTypeNumber.decoder,
      decoded: -Infinity,
    },
    { encoded: 42, decoder: jsonTypeInteger.decoder, decoded: 42n },
    { encoded: "-42", decoder: jsonTypeInteger.decoder, decoded: -42n },
    { encoded: "0xff", decoder: jsonTypeInteger.decoder, decoded: 255n },
    { encoded: "0xf_f", decoder: jsonTypeInteger.decoder, decoded: 255n },
    { encoded: "0b1_1", decoder: jsonTypeInteger.decoder, decoded: 3n },
    {
      encoded: { outer: { inner: 42 } },
      decoder: jsonDecoderObject({
        outer: jsonDecoderObject({
          inner: jsonTypeInteger.decoder,
        }),
      }),
      decoded: { outer: { inner: 42n } },
    },
    {
      encoded: 42,
      decoder: jsonDecoderTransform(
        jsonDecoderSplit([jsonTypeNumber.decoder, jsonTypeInteger.decoder]),
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
          number: (number: number) => `number:${number}`,
          string: (string: string) => `string:${string}`,
        }),
      }),
      decoded: new Map<string, string>([
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
