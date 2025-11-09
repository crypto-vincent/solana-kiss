import { it } from "@jest/globals";
import { idlProgramParse } from "../src";
import { idlTypeFullCodecValue } from "../src/idl/IdlTypeFullCodec";

it("run", async () => {
  const programIdl = idlProgramParse({
    accounts: {
      DummyAccount: {
        discriminator: [42],
        fields: [
          { name: "field1", type: "u8" },
          { name: "field2", type: "u16" },
        ],
      },
    },
  });

  // TODO (test) - better test with handmade idl

  const includes = new Set<string>();
  const codec = idlTypeFullCodecValue(
    programIdl.accounts.get("DummyAccount")!.typeFull,
    includes,
  );
  expect(codec.replace(/\s+/g, "")).toStrictEqual(
    codecValue(
      "jsonCodecObject",
      fakeObject({
        field1: "jsonCodecNumber",
        field2: "jsonCodecNumber",
      }),
    ),
  );
});

function codecValue(codecName: string, codecParams: string) {
  return `${codecName}(${codecParams})`;
}

function fakeObject(record: Record<string, string>): string {
  const fields = [];
  for (const [key, value] of Object.entries(record)) {
    fields.push(`${key}:${value}`);
  }
  return `{${fields.join(",")}}`;
}
