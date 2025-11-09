import { it } from "@jest/globals";
import { idlProgramParse } from "../src";
import { idlTypeFullJsonCodecValue } from "../src/idl/IdlTypeFullJsonCodec";

it("run", async () => {
  const programIdl = idlProgramParse({
    accounts: {
      DummyAccount: {
        discriminator: [42],
        fields: [
          { name: "field1", type: "u8" },
          { name: "field2", vec: "u16" },
          { name: "field3", option: "u32" },
          { name: "field4", variants: ["variant1", "variant2"] },
          {
            name: "field5",
            variants: [
              ["u8", "i128"],
              ["string", ["u8", 42]],
              {
                name: "Misc",
                fields: [
                  { name: "key", type: "pubkey" },
                  { name: "bool", type: "bool" },
                ],
              },
            ],
          },
        ],
      },
    },
  });
  const includes = new Set<string>();
  const codec = idlTypeFullJsonCodecValue(
    programIdl.accounts.get("DummyAccount")!.typeFull,
    includes,
  );
  expect(includes).toStrictEqual(
    new Set<string>([
      "jsonCodecObject",
      "jsonCodecArray",
      "jsonCodecNumber",
      "jsonCodecOptional",
      "jsonCodecConst",
      "jsonCodecObjectToEnum",
      "jsonCodecArrayToTuple",
      "jsonCodecInteger",
      "jsonCodecString",
      "jsonCodecBytesArray",
      "jsonCodecPubkey",
      "jsonCodecBoolean",
    ]),
  );
  expect(codec).toStrictEqual(
    stringCall(
      "jsonCodecObject",
      stringObject({
        field1: "jsonCodecNumber",
        field2: stringCall("jsonCodecArray", "jsonCodecNumber"),
        field3: stringCall("jsonCodecOptional", "jsonCodecNumber"),
        field4: stringCall(
          "jsonCodecConst",
          JSON.stringify("variant1"),
          JSON.stringify("variant2"),
        ),
        field5: stringCall(
          "jsonCodecObjectToEnum",
          stringObject({
            0: stringCall(
              "jsonCodecArrayToTuple",
              "jsonCodecNumber",
              "jsonCodecInteger",
            ),
            1: stringCall(
              "jsonCodecArrayToTuple",
              "jsonCodecString",
              "jsonCodecBytesArray",
            ),
            Misc: stringCall(
              "jsonCodecObject",
              stringObject({
                key: "jsonCodecPubkey",
                bool: "jsonCodecBoolean",
              }),
            ),
          }),
        ),
      }),
    ),
  );
});

function stringCall(codecName: string, ...codecParams: Array<string>) {
  return `${codecName}(${codecParams.join(",")})`;
}

function stringObject(record: Record<string, string>): string {
  const fields = [];
  for (const [key, value] of Object.entries(record)) {
    fields.push(`${key}:${value}`);
  }
  return `{${fields.join(",")}}`;
}
