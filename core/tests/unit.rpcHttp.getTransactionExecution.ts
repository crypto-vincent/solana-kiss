import { it } from "@jest/globals";
import { RpcHttp, rpcHttpGetTransaction } from "../src";

it("run", async () => {
  const rpcHttp: RpcHttp = async () => {
    return require("./fixtures/RpcHttpGetTransaction.json");
  };
  const dudu = await rpcHttpGetTransaction(rpcHttp, "!");
  // TODO - check the content of the execution
  console.log("dudu", JSON.stringify(dudu, null, 2));
});
