import { BlockSlot, blockSlotToNumber } from "../data/Block";
import {
  jsonCodecSignature,
  jsonDecoderArray,
  jsonDecoderObject,
} from "../data/Json";
import { Signature } from "../data/Signature";
import { RpcHttp } from "./RpcHttp";

export async function rpcHttpGetBlockTransactions(
  rpcHttp: RpcHttp,
  blockSlot: BlockSlot,
): Promise<{
  transactionsIds: Array<Signature>;
}> {
  const result = resultJsonDecoder(
    await rpcHttp("getBlock", [blockSlotToNumber(blockSlot)], {
      encoding: "base64",
      rewards: false,
      maxSupportedTransactionVersion: 0,
      transactionDetails: "signatures",
    }),
  );
  return { transactionsIds: result.signatures };
}

const resultJsonDecoder = jsonDecoderObject({
  signatures: jsonDecoderArray(jsonCodecSignature.decoder),
});
