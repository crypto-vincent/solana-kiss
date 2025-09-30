import { jsonTypeNumber, jsonTypeObject } from "../data/json";
import { Pubkey } from "../data/pubkey";
import { Commitment, Lamports } from "../types";
import { RpcHttp } from "./rpcHttp";

// TODO - should this return undefined if the account doesnt exist ?
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
  return String(result.value);
}

const resultJsonType = jsonTypeObject({
  value: jsonTypeNumber(),
});
