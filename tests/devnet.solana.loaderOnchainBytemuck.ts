import { promises as fsp } from "fs";
import {
  idlAccountDecode,
  idlAccountEncode,
  IdlTypeFull,
  idlTypeFullJsonCodecExpression,
  jsonGetAt,
  pubkeyFromBase58,
  Solana,
} from "../src";

it("run", async () => {
  const solana = new Solana("devnet");
  const accountAddress = pubkeyFromBase58(
    "FdoXZqdMysWbzB8j5bK6U5J1Dczsos1vGwQi5Tur2mwk",
  );
  const { accountIdl, accountData, accountState } =
    await solana.getAndInferAndDecodeAccount(accountAddress);

  expect(accountIdl.name).toStrictEqual("CoordinatorAccount");
  expect(jsonGetAt(accountState, "state.metadata.vocabSize")).toStrictEqual(
    "129280",
  );
  expect(
    jsonGetAt(accountState, "state.coordinator.config.min_clients"),
  ).toStrictEqual(24);

  const moduleName = "jsonCodecAccountBytemuck";
  const moduleCode = makeModuleCode(accountIdl.typeFull);
  await fsp.writeFile(`./tests/fixtures/${moduleName}.ts`, moduleCode);
  const requirePath = `./fixtures/${moduleName}.ts`;
  delete require.cache[require.resolve(requirePath)];
  const { jsonCodec } = require(requirePath);

  const contentDecoded = jsonCodec.decoder(accountState);
  expect(contentDecoded.state.metadata.vocabSize).toStrictEqual(129280n);
  expect(contentDecoded.state.coordinator.config.minClients).toStrictEqual(24);

  const { accountData: rencoded } = idlAccountEncode(
    accountIdl,
    jsonCodec.encoder(contentDecoded),
  );
  expect(rencoded.length).toStrictEqual(accountData.length);
  expect(idlAccountDecode(accountIdl, rencoded).accountState).toStrictEqual(
    accountState,
  );
});

function makeModuleCode(self: IdlTypeFull) {
  const dependencies = new Set<string>();
  const codecExpression = idlTypeFullJsonCodecExpression(self, dependencies);
  return [
    `import {${[...dependencies].join(",")}} from "../../src";`,
    `export const jsonCodec = ${codecExpression};`,
  ].join("\n");
}
