import {
  jsonGetAt,
  pubkeyFromBase58,
  rpcHttpFromUrl,
  Service,
  urlPublicRpcDevnet,
} from "../src";

it("run", async () => {
  const service = new Service(rpcHttpFromUrl(urlPublicRpcDevnet));
  const accountAddress = pubkeyFromBase58(
    "FdoXZqdMysWbzB8j5bK6U5J1Dczsos1vGwQi5Tur2mwk",
  );
  const { accountInfo } =
    await service.getAndInferAndDecodeAccountInfo(accountAddress);
  expect(accountInfo.idl?.name).toStrictEqual("CoordinatorAccount");
  expect(
    jsonGetAt(accountInfo.state, "state.metadata.vocab_size"),
  ).toStrictEqual("129280");
  expect(
    jsonGetAt(accountInfo.state, "state.coordinator.config.min_clients"),
  ).toStrictEqual(24);
});
