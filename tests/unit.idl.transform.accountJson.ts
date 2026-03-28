import { it } from "@jest/globals";
import { promises as fsp } from "fs";
import {
  IdlAccount,
  idlAccountDecode,
  idlAccountEncode,
  idlProgramParse,
  IdlTypeFull,
  idlTypeFullJsonCodecExpression,
  idlTypeFullJsonCodecTyping,
  pubkeyDefault,
} from "../src";

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
              { fields: ["string", ["u8", 42]] },
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
          { name: "field_snake_case", type: "u8" },
          { name: "invisible_blob", bytes: [77, 78, 79] },
          { name: "invisible_enum", variants: [] },
          { name: "invisible_struct", fields: [] },
          {
            name: "field_ending",
            candidates: [
              { name: "candidate1", type: "string" },
              { name: "candidate2", fields: [{ name: "x", type: "u64" }] },
              { name: "candidate3", type: "u8" },
              { name: "candidate4", fields: [] },
            ],
          },
        ],
      },
    },
  });
  const accountIdl = programIdl.accounts.get("DummyAccount")!;

  const dependenciesExpression = new Set<string>();
  const codecExpression = idlTypeFullJsonCodecExpression(
    accountIdl.typeFull,
    dependenciesExpression,
  );
  expect(dependenciesExpression).toStrictEqual(
    new Set<string>([
      "jsonCodecConst",
      "jsonCodecString",
      "jsonCodecNumber",
      "jsonCodecBoolean",
      "jsonCodecBigInt",
      "jsonCodecPubkey",
      "jsonCodecNullable",
      "jsonCodecArrayToArray",
      "jsonCodecArrayToTuple",
      "jsonCodecArrayToBytes",
      "jsonCodecObjectToEnum",
      "jsonCodecObjectToObject",
    ]),
  );
  expect(codecExpression.replace(/\s/g, "")).toStrictEqual(
    stringCall(
      "jsonCodecObjectToObject",
      stringObject({
        field1: "jsonCodecNumber",
        field2: stringCall("jsonCodecArrayToArray", "jsonCodecNumber"),
        field3: stringCall("jsonCodecNullable", "jsonCodecNumber"),
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
              stringArray(["jsonCodecString", "jsonCodecArrayToBytes"]),
            ),
            1: stringCall(
              "jsonCodecArrayToTuple",
              stringArray(["jsonCodecNumber", "jsonCodecBigInt"]),
            ),
            Misc: stringCall(
              "jsonCodecObjectToObject",
              stringObject({
                key: "jsonCodecPubkey",
                bool: "jsonCodecBoolean",
              }),
            ),
            Empty: stringCall("jsonCodecConst", "null"),
          }),
        ),
        fieldSnakeCase: "jsonCodecNumber",
        fieldEnding: stringCall(
          "jsonCodecObjectToEnum",
          stringObject({
            candidate1: "jsonCodecString",
            candidate2: stringCall(
              "jsonCodecObjectToObject",
              stringObject({ x: "jsonCodecBigInt" }),
            ),
            candidate3: "jsonCodecNumber",
            candidate4: stringCall("jsonCodecConst", "null"),
          }),
        ),
      }),
    ),
  );

  const dependenciesTyping = new Set<string>();
  const codecTyping = idlTypeFullJsonCodecTyping(
    accountIdl.typeFull,
    dependenciesTyping,
  );
  expect(dependenciesTyping).toStrictEqual(
    new Set<string>(["Pubkey", "OneKeyOf"]),
  );
  expect(codecTyping.replace(/\s/g, "")).toStrictEqual(
    stringObject({
      field1: "number",
      field2: "Array<number>",
      field3: "null|number",
      field4: `"variant1"|"variant2"`,
      field5: `OneKeyOf<${stringObject({
        0: stringArray(["string", "Uint8Array"]),
        1: stringArray(["number", "bigint"]),
        Misc: stringObject({
          key: "Pubkey",
          bool: "boolean",
        }),
        Empty: "null",
      })}>`,
      fieldSnakeCase: "number",
      fieldEnding: `OneKeyOf<${stringObject({
        candidate1: "string",
        candidate2: stringObject({ x: "bigint" }),
        candidate3: "number",
        candidate4: "null",
      })}>`,
    }),
  );

  const moduleName = "jsonCodecAccountDummy";
  const moduleCode = makeModuleCode(accountIdl.typeFull);
  await fsp.writeFile(`./tests/fixtures/${moduleName}.ts`, moduleCode);
  const requirePath = `./fixtures/${moduleName}.ts`;
  delete require.cache[require.resolve(requirePath)];
  const { jsonCodec } = require(requirePath);

  checkRoundTrip(accountIdl, jsonCodec, {
    field1: 42,
    field2: [65535],
    field3: 77,
    field4: "variant1",
    field5: { 0: ["hello", new Uint8Array(42).fill(255)] },
    fieldSnakeCase: 1,
    fieldEnding: { candidate1: "string" },
  });
  checkRoundTrip(accountIdl, jsonCodec, {
    field1: 0,
    field2: [],
    field3: 123456,
    field4: "variant2",
    field5: { Empty: null },
    fieldSnakeCase: 2,
    fieldEnding: { candidate2: { x: 42 } },
  });
  checkRoundTrip(accountIdl, jsonCodec, {
    field1: 128,
    field2: [1, 2, 3, 4, 5],
    field3: null,
    field4: "variant1",
    field5: { 1: [255, -1234567890123456789n] },
    fieldSnakeCase: 3,
    fieldEnding: { candidate3: 255 },
  });
  checkRoundTrip(accountIdl, jsonCodec, {
    field1: 7,
    field2: [42, 43],
    field3: null,
    field4: "variant2",
    field5: { Misc: { key: pubkeyDefault, bool: true } },
    fieldSnakeCase: 4,
    fieldEnding: { candidate4: null },
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

function stringArray(items: Array<string>): string {
  return `[${items.join(",")}]`;
}

function checkRoundTrip(accountIdl: IdlAccount, jsonCodec: any, decoded: any) {
  const encoded = jsonCodec.encoder(decoded);
  const { accountData } = idlAccountEncode(accountIdl, encoded);
  expect(
    idlAccountEncode(
      accountIdl,
      idlAccountDecode(accountIdl, accountData).accountState,
    ).accountData,
  ).toStrictEqual(accountData);
}

function makeModuleCode(self: IdlTypeFull) {
  const dependencies = new Set<string>(["JsonCodec"]);
  const codecTyping = idlTypeFullJsonCodecTyping(self, dependencies);
  const codecExpression = idlTypeFullJsonCodecExpression(self, dependencies);
  return [
    `import {${[...dependencies].join(",")}} from "../../src";`,
    `export const jsonCodec: JsonCodec<${codecTyping}> = ${codecExpression};`,
  ].join("\n");
}
