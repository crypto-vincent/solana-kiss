import { Blockhash } from "../data/Blockhash";
import {
  jsonDecoderObject,
  jsonTypeBlockhash,
  jsonTypeNumber,
} from "../data/Json";
import { RpcHttp } from "./RpcHttp";
import { Commitment } from "./RpcTypes";

export async function rpcHttpGetLatestBlockhash(
  rpcHttp: RpcHttp,
  context?: {
    commitment?: Commitment;
  },
): Promise<Blockhash> {
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
    blockhash: jsonTypeBlockhash.decoder,
    lastValidBlockHeight: jsonTypeNumber.decoder,
  }),
});
