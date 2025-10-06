import { expect, it } from "@jest/globals";
import {
  JsonDecoder,
  jsonDecoderObject,
  jsonTypeFloating,
  jsonTypeInteger,
  JsonValue,
} from "../src";

it("run", async () => {
  const tests: Array<{
    encoded: JsonValue;
    decoder: JsonDecoder<any>;
    decoded: any;
  }> = [
    { encoded: 42, decoder: jsonTypeInteger.decoder, decoded: 42n },
    { encoded: "-42", decoder: jsonTypeInteger.decoder, decoded: -42n },
    { encoded: "0xff", decoder: jsonTypeInteger.decoder, decoded: 255n },
    { encoded: "0xf_f", decoder: jsonTypeInteger.decoder, decoded: 255n },
    { encoded: "0b1_1", decoder: jsonTypeInteger.decoder, decoded: 3n },
    { encoded: 0.33, decoder: jsonTypeFloating.decoder, decoded: 0.33 },
    { encoded: "0.33", decoder: jsonTypeFloating.decoder, decoded: 0.33 },
    { encoded: "3.3e-1", decoder: jsonTypeFloating.decoder, decoded: 0.33 },
    {
      encoded: { outer: { inner: 42 } },
      decoder: jsonDecoderObject((key) => key, {
        outer: jsonDecoderObject((key) => key, {
          inner: jsonTypeInteger.decoder,
        }),
      }),
      decoded: { outer: { inner: 42n } },
    },
  ];
  for (const test of tests) {
    expect(test.decoder(test.encoded)).toStrictEqual(test.decoded);
  }
});
