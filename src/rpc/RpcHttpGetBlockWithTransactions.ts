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

/**
 * Fetches block metadata along with the ordered list of transaction signatures for the given slot.
 *
 * @param self - The {@link RpcHttp} client to use.
 * @param blockSlot - The {@link BlockSlot} to query.
 * @returns An object containing:
 *   - `previousBlockSlot` – the parent block's {@link BlockSlot}.
 *   - `blockHeight` – the block height, or `undefined` if not available.
 *   - `blockTime` – the block production time as a `Date`, or `undefined` if not available.
 *   - `blockHash` – the block's {@link BlockHash}.
 *   - `oldToNewTransactionsHandles` – {@link TransactionHandle}s ordered from oldest to newest within the block.
 */
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
