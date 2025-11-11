import { expect, it } from "@jest/globals";
import {
  jsonCodecNumber,
  JsonEncoder,
  jsonEncoderNullable,
  jsonEncoderOptional,
  JsonValue,
} from "../src";

it("run", async () => {
  const tests: Array<{
    decoded: any;
    encoder: JsonEncoder<any>;
    encoded: JsonValue;
  }> = [
    { decoded: NaN, encoder: jsonCodecNumber.encoder, encoded: "NaN" },
    {
      decoded: Infinity,
      encoder: jsonCodecNumber.encoder,
      encoded: "Infinity",
    },
    {
      decoded: -Infinity,
      encoder: jsonCodecNumber.encoder,
      encoded: "-Infinity",
    },
    {
      decoded: null,
      encoder: jsonEncoderNullable(jsonCodecNumber.encoder),
      encoded: null,
    },
    {
      decoded: undefined,
      encoder: jsonEncoderNullable(jsonCodecNumber.encoder),
      encoded: "NaN",
    },
    {
      decoded: null,
      encoder: jsonEncoderOptional(jsonCodecNumber.encoder),
      encoded: null,
    },
    {
      decoded: undefined,
      encoder: jsonEncoderOptional(jsonCodecNumber.encoder),
      encoded: null,
    },
  ];
  for (const test of tests) {
    expect(test.encoder(test.decoded)).toStrictEqual(test.encoded);
  }
});
