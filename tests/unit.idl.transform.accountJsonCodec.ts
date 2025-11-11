import { it } from "@jest/globals";
import { promises as fsp } from "fs";
import {
  IdlAccount,
  idlAccountDecode,
  idlAccountEncode,
  idlProgramParse,
  pubkeyDefault,
} from "../src";
import {
  idlTypeFullJsonCodecExpression,
  idlTypeFullJsonCodecModule,
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
              { name: "Empty" },
            ],
          },
          { name: "invisible_blob", bytes: [77, 78, 79] },
          { name: "invisible_enum", variants: [] },
          { name: "invisible_struct", fields: [] },
        ],
      },
    },
  });
  const accountIdl = programIdl.accounts.get("DummyAccount")!;

  const dependencies = new Set<string>();
  const codec = idlTypeFullJsonCodecExpression(
    accountIdl.typeFull,
    dependencies,
  );
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
            Empty: stringCall("jsonCodecConst", "null"),
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
  const { jsonCodecAccountDummy: jsonCodec } = require(requirePath);

  checkRoundTrip(accountIdl, jsonCodec, {
    field1: 42,
    field2: [65535],
    field3: 77,
    field4: "variant1",
    field5: { 0: ["hello", new Uint8Array(42).fill(255)] },
  });
  checkRoundTrip(accountIdl, jsonCodec, {
    field1: 0,
    field2: [],
    field3: 123456,
    field4: "variant2",
    field5: { Empty: null },
  });
  checkRoundTrip(accountIdl, jsonCodec, {
    field1: 128,
    field2: [1, 2, 3, 4, 5],
    field4: "variant1",
    field5: { 1: [255, -1234567890123456789n] },
  });
  checkRoundTrip(accountIdl, jsonCodec, {
    field1: 7,
    field2: [42, 43],
    field4: "variant2",
    field5: { Misc: { key: pubkeyDefault, bool: true } },
  });
});

function stringCall(codecName: string, ...codecParams: Array<string>) {
  return `${codecName}(${codecParams.join(",")})`;
}

function stringObject(record: Record<string, string>): string {
  const entries = [];
  for (const [key, value] of Object.entries(record)) {
    entries.push(`${key}:${value}`);
  }
  return `{${entries.join(",")}}`;
}

function checkRoundTrip(accountIdl: IdlAccount, jsonCodec: any, decoded: any) {
  const encoded = jsonCodec.encoder(decoded);
  const bytes = idlAccountEncode(accountIdl, encoded);
  expect(
    idlAccountEncode(accountIdl, idlAccountDecode(accountIdl, bytes)),
  ).toStrictEqual(bytes);
}
