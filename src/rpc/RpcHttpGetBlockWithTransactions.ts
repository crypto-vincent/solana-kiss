import { BlockHash, BlockSlot, blockSlotToNumber } from "../data/Block";
import {
  jsonCodecBlockHash,
  jsonCodecBlockSlot,
  jsonCodecNumber,
  jsonCodecSignature,
  jsonDecoderArray,
  jsonDecoderObject,
  jsonDecoderOptional,
} from "../data/Json";
import { TransactionHandle } from "../data/Transaction";
import { RpcHttp } from "./RpcHttp";

export async function rpcHttpGetBlockWithTransactions(
  rpcHttp: RpcHttp,
  blockSlot: BlockSlot,
): Promise<{
  previousBlockSlot: BlockSlot;
  blockInfo: {
    height: number | undefined;
    time: Date | undefined;
    hash: BlockHash;
  };
  transactionsHandles: Array<TransactionHandle>; // TODO (naming) - are those ordered ? in which order ?
}> {
  const result = resultJsonDecoder(
    await rpcHttp("getBlock", [blockSlotToNumber(blockSlot)], {
      encoding: "base64",
      rewards: false,
      maxSupportedTransactionVersion: 0,
      transactionDetails: "signatures",
    }),
  );
  return {
    previousBlockSlot: result.parentSlot,
    blockInfo: {
      height: result.blockHeight,
      time: result.blockTime ? new Date(result.blockTime * 1000) : undefined,
      hash: result.blockhash,
    },
    transactionsHandles: result.signatures,
  };
}

const resultJsonDecoder = jsonDecoderObject({
  parentSlot: jsonCodecBlockSlot.decoder,
  blockHeight: jsonDecoderOptional(jsonCodecNumber.decoder),
  blockTime: jsonDecoderOptional(jsonCodecNumber.decoder),
  blockhash: jsonCodecBlockHash.decoder,
  signatures: jsonDecoderArray(jsonCodecSignature.decoder),
});
