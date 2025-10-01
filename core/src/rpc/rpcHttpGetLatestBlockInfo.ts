import { jsonTypeNumber, jsonTypeObject, jsonTypeString } from "../data/Json";
import { Commitment, Hash, Slot } from "../types";
import { RpcHttp } from "./RpcHttp";

export async function rpcHttpGetLatestBlockInfo(
  rpcHttp: RpcHttp,
  context?: {
    commitment?: Commitment;
  },
): Promise<{
  slot: Slot;
  hash: Hash;
  height: number;
}> {
  const result = resultJsonType.decode(
    await rpcHttp("getLatestBlockhash", [{ commitment: context?.commitment }]),
  );
  return {
    hash: result.value.blockhash,
    slot: result.context.slot,
    height: result.value.lastValidBlockHeight,
  };
}

const resultJsonType = jsonTypeObject({
  context: jsonTypeObject({
    slot: jsonTypeNumber(),
  }),
  value: jsonTypeObject({
    blockhash: jsonTypeString(),
    lastValidBlockHeight: jsonTypeNumber(),
  }),
});
