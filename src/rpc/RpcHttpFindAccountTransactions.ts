import {
  jsonCodecSignature,
  jsonDecoderArrayToArray,
  jsonDecoderObjectToObject,
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
): Promise<{ newToOldTransactionsHandles: Array<TransactionHandle> }> {
  const newToOldTransactionsHandles = new Array<TransactionHandle>();
  const batchSize = Math.min(
    1000,
    maxResultLength - newToOldTransactionsHandles.length,
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
      newToOldTransactionsHandles.push(transactionHandle);
      if (newToOldTransactionsHandles.length >= maxResultLength) {
        return { newToOldTransactionsHandles };
      }
      if (transactionHandle === rewindUntilTransactionHandle) {
        return { newToOldTransactionsHandles };
      }
      startBeforeTransactionHandle = transactionHandle;
    }
    if (result.length < batchSize) {
      return { newToOldTransactionsHandles };
    }
  }
}

const resultJsonDecoder = jsonDecoderArrayToArray(
  jsonDecoderObjectToObject({ signature: jsonCodecSignature.decoder }),
);
