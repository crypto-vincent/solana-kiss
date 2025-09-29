import { it } from "@jest/globals";
import { rpcHttpFromUrl, rpcHttpGetTransactionExecution } from "../src";

it("run", async () => {
  const rpc = rpcHttpFromUrl("https://api.mainnet-beta.solana.com");

  const result5 = await rpcHttpGetTransactionExecution(
    rpc,
    "5GkSm41sEeE72H2tVnpV8SRgz6476ikz6T2x7ANJ6btGbK1zzKa1523Tf7nkGm88b7tCA4zoHXiDqGDUqD3AAm8D",
  );
  console.log("result5", result5);
});
