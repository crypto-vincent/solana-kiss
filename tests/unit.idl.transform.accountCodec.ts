import { it } from "@jest/globals";
import { promises as fsp } from "fs";
import { idlAccountDecode, idlAccountEncode, idlProgramParse } from "../src";
import {
  idlTypeFullJsonCodecModule,
  idlTypeFullJsonCodecValue,
} from "../src/idl/IdlTypeFullJsonCodec";

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
              ["string", ["u8", 42]],
              ["u8", "i128"],
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
  const accountIdl = programIdl.accounts.get("DummyAccount")!;
  const dependencies = new Set<string>();
  const codec = idlTypeFullJsonCodecValue(accountIdl.typeFull, dependencies);
  expect(dependencies).toStrictEqual(
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
  expect(codec.replace(/\s/g, "")).toStrictEqual(
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
              "jsonCodecString",
              "jsonCodecBytesArray",
            ),
            1: stringCall(
              "jsonCodecArrayToTuple",
              "jsonCodecNumber",
              "jsonCodecInteger",
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

  const moduleName = "jsonCodecAccountDummy";
  const modulePath = `./tests/fixtures/${moduleName}.ts`;
  const moduleCode = idlTypeFullJsonCodecModule(
    accountIdl.typeFull,
    moduleName,
    "../../src",
  );
  await fsp.writeFile(modulePath, moduleCode);
  const requirePath = `./fixtures/${moduleName}.ts`;
  delete require.cache[require.resolve(requirePath)];
  const { jsonCodecAccountDummy } = require(requirePath);

  const decoded = {
    field1: 255,
    field2: [1, 2, 3],
    field4: "variant2",
    field5: { 1: [42, 42n] },
  };
  const bytes = idlAccountEncode(
    accountIdl,
    jsonCodecAccountDummy.encoder(decoded),
  );
  expect(
    jsonCodecAccountDummy.decoder(idlAccountDecode(accountIdl, bytes)),
  ).toStrictEqual(decoded);
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
