import { BlockHash, BlockSlot, blockSlotToNumber } from "../data/Block";
import {
  jsonCodecBlockHash,
  jsonCodecBlockSlot,
  jsonCodecNumber,
  jsonCodecSignature,
  jsonDecoderArrayToArray,
  jsonDecoderNullable,
  jsonDecoderObjectToObject,
} from "../data/Json";
import { TransactionHandle } from "../data/Transaction";
import { RpcHttp } from "./RpcHttp";

/** Fetches block metadata and its transaction signatures. */
export async function rpcHttpGetBlockWithTransactions(
  self: RpcHttp,
  blockSlot: BlockSlot,
): Promise<{
  previousBlockSlot: BlockSlot;
  blockHeight: number | undefined;
  blockTime: Date | undefined;
  blockHash: BlockHash;
  oldToNewTransactionsHandles: Array<TransactionHandle>;
}> {
  const result = resultJsonDecoder(
    await self("getBlock", [blockSlotToNumber(blockSlot)], {
      encoding: "base64",
      rewards: false,
      maxSupportedTransactionVersion: 0,
      transactionDetails: "signatures",
    }),
  );
  return {
    previousBlockSlot: result.parentSlot,
    blockHeight: result.blockHeight ?? undefined,
    blockTime: result.blockTime ? new Date(result.blockTime * 1000) : undefined,
    blockHash: result.blockhash,
    oldToNewTransactionsHandles: result.signatures,
  };
}

const resultJsonDecoder = jsonDecoderObjectToObject({
  parentSlot: jsonCodecBlockSlot.decoder,
  blockHeight: jsonDecoderNullable(jsonCodecNumber.decoder),
  blockTime: jsonDecoderNullable(jsonCodecNumber.decoder),
  blockhash: jsonCodecBlockHash.decoder,
  signatures: jsonDecoderArrayToArray(jsonCodecSignature.decoder),
});
