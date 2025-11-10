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
  const { accountInfo } =
    await solana.getAndInferAndDecodeAccountInfo(accountAddress);
  expect(accountInfo.idl?.name).toStrictEqual("CoordinatorAccount");
  expect(
    jsonGetAt(accountInfo.state, "state.metadata.vocab_size"),
  ).toStrictEqual("129280");
  expect(
    jsonGetAt(accountInfo.state, "state.coordinator.config.min_clients"),
  ).toStrictEqual(24);

  const moduleName = "jsonCodecAccountBytemuck";
  const modulePath = `./tests/fixtures/${moduleName}.ts`;
  const moduleCode = idlTypeFullJsonCodecModule(
    accountInfo.idl.typeFull,
    moduleName,
    "../../src",
  );
  await fsp.writeFile(modulePath, moduleCode);
  const requirePath = `./fixtures/${moduleName}.ts`;
  delete require.cache[require.resolve(requirePath)];
  const { jsonCodecAccountBytemuck } = require(requirePath);

  const contentDecoded = jsonCodecAccountBytemuck.decoder(accountInfo.state);
  expect(contentDecoded.state.metadata.vocabSize).toStrictEqual(129280n);
  expect(contentDecoded.state.coordinator.config.minClients).toStrictEqual(24);

  const reencoded = idlAccountEncode(
    accountInfo.idl,
    jsonCodecAccountBytemuck.encoder(contentDecoded),
  );
  expect(reencoded.length).toStrictEqual(accountInfo.data.length);

  const redecoded = idlAccountDecode(accountInfo.idl, reencoded);
  expect(redecoded).toStrictEqual(accountInfo.state);
});
