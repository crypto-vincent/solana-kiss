import {
  jsonCodecSignature,
  jsonDecoderArray,
  jsonDecoderObject,
} from "../data/Json";
import { Pubkey, pubkeyToBase58 } from "../data/Pubkey";
import { TransactionHandle } from "../data/Transaction";
import { RpcHttp } from "./RpcHttp";

export async function rpcHttpFindAccountTransactions(
  self: RpcHttp,
  accountAddress: Pubkey,
  maxResultLength: number,
  pagination?: {
    startBeforeTransactionHandle?: TransactionHandle;
    rewindUntilTransactionHandle?: TransactionHandle;
  },
): Promise<{ rewindingTransactionsHandles: Array<TransactionHandle> }> {
  const rewindingTransactionsHandles = new Array<TransactionHandle>();
  const batchSize = Math.min(
    1000,
    maxResultLength - rewindingTransactionsHandles.length,
  );
  const rewindUntilTransactionHandle = pagination?.rewindUntilTransactionHandle;
  let startBeforeTransactionHandle = pagination?.startBeforeTransactionHandle;
  while (true) {
    const result = resultJsonDecoder(
      await self("getSignaturesForAddress", [pubkeyToBase58(accountAddress)], {
        limit: batchSize,
        before: startBeforeTransactionHandle
          ? startBeforeTransactionHandle
          : undefined,
      }),
    );
    for (const item of result) {
      const transactionHandle = item.signature;
      rewindingTransactionsHandles.push(transactionHandle);
      if (rewindingTransactionsHandles.length >= maxResultLength) {
        return { rewindingTransactionsHandles };
      }
      if (transactionHandle === rewindUntilTransactionHandle) {
        return { rewindingTransactionsHandles };
      }
      startBeforeTransactionHandle = transactionHandle;
    }
    if (result.length < batchSize) {
      return { rewindingTransactionsHandles };
    }
  }
}

const resultJsonDecoder = jsonDecoderArray(
  jsonDecoderObject({ signature: jsonCodecSignature.decoder }),
);
