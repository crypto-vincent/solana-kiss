import { jsonTypeObject, jsonTypeString } from "../data/json";
import { Commitment, Hash } from "../types";
import { RpcHttp } from "./rpcHttp";

export async function rpcHttpGetLatestBlockHash(
  rpcHttp: RpcHttp,
  context?: {
    commitment?: Commitment;
  },
): Promise<Hash> {
  const result = resultJsonType.decode(
    await rpcHttp("getLatestBlockhash", [
      {
        commitment: context?.commitment,
      },
    ]),
  );
  return result.value.blockhash;
}

const resultJsonType = jsonTypeObject({
  value: jsonTypeObject({
    blockhash: jsonTypeString(),
  }),
});
