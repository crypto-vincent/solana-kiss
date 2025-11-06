import { expect, it } from "@jest/globals";
import { rpcHttpSendTransaction, TransactionPacket } from "../src";

function rpcHttp() {
  return require("./fixtures/RpcHttpSendTransaction.json");
}

it("run", async () => {
  const { transactionHandle } = await rpcHttpSendTransaction(
    rpcHttp,
    new Uint8Array() as TransactionPacket,
    { failOnAlreadyProcessed: true },
  );
  expect(transactionHandle).toStrictEqual(
    "2id3YC2jK9G5Wo2phDx4gJVAew8DcY5NAojnVuao8rkxwPYPe8cSwE5GzhEgJA2y8fVjDEo6iR6ykBvDxrTQrtpb",
  );
});
