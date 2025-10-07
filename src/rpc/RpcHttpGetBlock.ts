import { BlockSlot, blockSlotToNumber } from "../data/Block";
import {
  jsonDecoderArray,
  jsonDecoderNullable,
  jsonDecoderObject,
  jsonTypeBlockHash,
  jsonTypeBlockSlot,
  jsonTypeNumber,
  jsonTypeSignature,
} from "../data/Json";
import { RpcHttp } from "./RpcHttp";

export async function rpcHttpGetBlock(rpcHttp: RpcHttp, blockSlot: BlockSlot) {
  const result = resultJsonDecoder(
    await rpcHttp("getBlock", [blockSlotToNumber(blockSlot)], {
      encoding: "base64",
      rewards: false,
      maxSupportedTransactionVersion: 0,
      transactionDetails: "signatures",
    }),
  );
  return {
    height: result.blockHeight ?? undefined,
    time: result.blockTime ? new Date(result.blockTime * 1000) : undefined,
    hash: result.blockhash,
    signatures: result.signatures,
  };
}

const resultJsonDecoder = jsonDecoderObject({
  blockHeight: jsonDecoderNullable(jsonTypeNumber.decoder),
  blockTime: jsonDecoderNullable(jsonTypeNumber.decoder),
  blockhash: jsonTypeBlockHash.decoder,
  parentSlot: jsonTypeBlockSlot.decoder,
  previousBlockhash: jsonTypeBlockHash.decoder,
  signatures: jsonDecoderArray(jsonTypeSignature.decoder),
});
