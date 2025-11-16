import { promises as fsp } from "fs";
import {
  idlAccountDecode,
  idlAccountEncode,
  idlTypeFullJsonCodecModule,
  jsonGetAt,
  pubkeyFromBase58,
  rpcHttpFromUrl,
  Solana,
  urlRpcPublicDevnet,
} from "../src";

it("run", async () => {
  const solana = new Solana(rpcHttpFromUrl(urlRpcPublicDevnet));
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
  const modulePath = `./tests/fixtures/${moduleName}.ts`;
  const moduleCode = idlTypeFullJsonCodecModule(
    accountIdl.typeFull,
    moduleName,
    "../../src",
  );
  await fsp.writeFile(modulePath, moduleCode);
  const requirePath = `./fixtures/${moduleName}.ts`;
  delete require.cache[require.resolve(requirePath)];
  const { jsonCodecAccountBytemuck } = require(requirePath);

  const contentDecoded = jsonCodecAccountBytemuck.decoder(accountState);
  expect(contentDecoded.state.metadata.vocabSize).toStrictEqual(129280n);
  expect(contentDecoded.state.coordinator.config.minClients).toStrictEqual(24);

  const { accountData: rencoded } = idlAccountEncode(
    accountIdl,
    jsonCodecAccountBytemuck.encoder(contentDecoded),
  );
  expect(rencoded.length).toStrictEqual(accountData.length);
  expect(idlAccountDecode(accountIdl, rencoded).accountState).toStrictEqual(
    accountState,
  );
});
