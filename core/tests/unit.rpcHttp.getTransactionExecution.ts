import { it } from "@jest/globals";
import { RpcHttp, rpcHttpGetTransactionExecution } from "../src";

it("run", async () => {
  const rpcHttp: RpcHttp = async () => {
    return require("./fixtures/rpcHttp.getTransaction.json");
  };
  const dudu = await rpcHttpGetTransactionExecution(rpcHttp, "!");
  // TODO - check the content of the execution
  console.log("dudu", JSON.stringify(dudu, null, 2));
});
