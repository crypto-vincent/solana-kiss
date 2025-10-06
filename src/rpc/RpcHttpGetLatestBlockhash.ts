import { BlockHash } from "../data/Block";
import {
  jsonDecoderObject,
  jsonTypeBlockHash,
  jsonTypeNumber,
} from "../data/Json";
import { RpcHttp } from "./RpcHttp";
import { Commitment } from "./RpcTypes";

export async function rpcHttpGetLatestBlockHash(
  rpcHttp: RpcHttp,
  context?: {
    commitment?: Commitment;
  },
): Promise<BlockHash> {
  const result = resultJsonDecoder(
    await rpcHttp("getLatestBlockhash", [{ commitment: context?.commitment }]),
  );
  return result.value.blockhash;
}

const resultJsonDecoder = jsonDecoderObject((key) => key, {
  context: jsonDecoderObject((key) => key, {
    slot: jsonTypeNumber.decoder,
  }),
  value: jsonDecoderObject((key) => key, {
    blockhash: jsonTypeBlockHash.decoder,
    lastValidBlockHeight: jsonTypeNumber.decoder,
  }),
});
