import { jsonTypeNumber, jsonTypeObject } from "../data/json";
import { Lamports } from "../data/lamports";
import { Pubkey } from "../data/pubkey";
import { Commitment } from "../types";
import { RpcHttp } from "./rpcHttp";

export async function rpcHttpGetAccountLamports(
  rpcHttp: RpcHttp,
  accountAddress: Pubkey,
  context?: {
    commitment?: Commitment;
  },
): Promise<Lamports> {
  const result = resultJsonType.decode(
    await rpcHttp("getBalance", [
      accountAddress,
      { commitment: context?.commitment },
    ]),
  );
  return BigInt(result.value);
}

const resultJsonType = jsonTypeObject({
  value: jsonTypeNumber(),
});
