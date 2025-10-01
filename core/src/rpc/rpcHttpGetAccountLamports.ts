import { jsonTypeNumber, jsonTypeObject } from "../data/Json";
import { Lamports } from "../data/Lamports";
import { Pubkey } from "../data/Pubkey";
import { Commitment } from "../types";
import { RpcHttp } from "./RpcHttp";

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
