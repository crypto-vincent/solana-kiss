import {
  jsonDecodeNumber,
  jsonDecoderObject,
  jsonDecodeString,
} from "../data/Json";
import { Commitment, Hash, Slot } from "../data/Onchain";
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
  const result = resultDecode(
    await rpcHttp("getLatestBlockhash", [{ commitment: context?.commitment }]),
  );
  return {
    hash: result.value.blockhash,
    slot: result.context.slot,
    height: result.value.lastValidBlockHeight,
  };
}

const resultDecode = jsonDecoderObject({
  context: jsonDecoderObject({
    slot: jsonDecodeNumber,
  }),
  value: jsonDecoderObject({
    blockhash: jsonDecodeString,
    lastValidBlockHeight: jsonDecodeNumber,
  }),
});
