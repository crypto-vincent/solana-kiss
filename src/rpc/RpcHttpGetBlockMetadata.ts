import { BlockHash, BlockSlot, blockSlotToNumber } from "../data/Block";
import {
  jsonCodecBlockHash,
  jsonCodecBlockSlot,
  jsonCodecNumber,
  jsonDecoderNullable,
  jsonDecoderObject,
} from "../data/Json";
import { RpcHttp } from "./RpcHttp";

export async function rpcHttpGetBlockMetadata(
  rpcHttp: RpcHttp,
  blockSlot: BlockSlot,
): Promise<{
  blockInfo: {
    height: number | undefined;
    time: Date | undefined;
    hash: BlockHash;
  };
  parentBlockSlot: BlockSlot;
}> {
  const result = resultJsonDecoder(
    await rpcHttp("getBlock", [blockSlotToNumber(blockSlot)], {
      encoding: "base64",
      rewards: false,
      maxSupportedTransactionVersion: 0,
      transactionDetails: "none",
    }),
  );
  return {
    blockInfo: {
      height: result.blockHeight ?? undefined,
      time: result.blockTime ? new Date(result.blockTime * 1000) : undefined,
      hash: result.blockhash,
    },
    parentBlockSlot: result.parentSlot,
  };
}

const resultJsonDecoder = jsonDecoderObject({
  blockHeight: jsonDecoderNullable(jsonCodecNumber.decoder),
  blockTime: jsonDecoderNullable(jsonCodecNumber.decoder),
  blockhash: jsonCodecBlockHash.decoder,
  parentSlot: jsonCodecBlockSlot.decoder,
  previousBlockhash: jsonCodecBlockHash.decoder,
});
