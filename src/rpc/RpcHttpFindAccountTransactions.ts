import {
  jsonCodecSignature,
  jsonDecoderArray,
  jsonDecoderObject,
} from "../data/Json";
import { Pubkey, pubkeyToBase58 } from "../data/Pubkey";
import { signatureToBase58 } from "../data/Signature";
import { TransactionId } from "../data/Transaction";
import { RpcHttp } from "./RpcHttp";

export async function rpcHttpFindAccountTransactions(
  rpcHttp: RpcHttp,
  accountAddress: Pubkey,
  maxResultLength: number,
  pagination?: {
    startBeforeTransactionId?: TransactionId;
    rewindUntilTransactionId?: TransactionId;
  },
): Promise<{ backwardTransactionsIds: Array<TransactionId> }> {
  const backwardTransactionsIds = new Array<TransactionId>();
  const requestLimit = 1000;
  const rewindUntilTransactionId = pagination?.rewindUntilTransactionId;
  let startBeforeTransactionId = pagination?.startBeforeTransactionId;
  while (true) {
    const result = resultJsonDecoder(
      await rpcHttp(
        "getSignaturesForAddress",
        [pubkeyToBase58(accountAddress)],
        {
          limit: requestLimit,
          before: startBeforeTransactionId
            ? signatureToBase58(startBeforeTransactionId)
            : undefined,
        },
      ),
    );
    for (const item of result) {
      const transactionId = item.signature;
      backwardTransactionsIds.push(transactionId);
      if (backwardTransactionsIds.length >= maxResultLength) {
        return { backwardTransactionsIds };
      }
      if (transactionId === rewindUntilTransactionId) {
        return { backwardTransactionsIds };
      }
      startBeforeTransactionId = transactionId;
    }
    if (result.length < requestLimit) {
      return { backwardTransactionsIds };
    }
  }
}

const resultJsonDecoder = jsonDecoderArray(
  jsonDecoderObject({ signature: jsonCodecSignature.decoder }),
);
