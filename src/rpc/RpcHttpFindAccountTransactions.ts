import {
  jsonCodecSignature,
  jsonDecoderArray,
  jsonDecoderObject,
} from "../data/Json";
import { Pubkey, pubkeyToBase58 } from "../data/Pubkey";
import { Signature, signatureToBase58 } from "../data/Signature";
import { RpcHttp } from "./RpcHttp";

export async function rpcHttpFindAccountTransactions(
  rpcHttp: RpcHttp,
  accountAddress: Pubkey,
  maxResultLength: number,
  pagination?: {
    startBeforeTransactionId?: Signature;
    rewindUntilTransactionId?: Signature;
  },
): Promise<{ backwardTransactionsIds: Array<Signature> }> {
  const requestLimit = 1000;
  const backTransactionsIds = new Array<Signature>();
  const rewindUntil = pagination?.rewindUntilTransactionId;
  let startBefore = pagination?.startBeforeTransactionId;
  while (true) {
    const result = resultJsonDecoder(
      await rpcHttp(
        "getSignaturesForAddress",
        [pubkeyToBase58(accountAddress)],
        {
          limit: requestLimit,
          before: startBefore ? signatureToBase58(startBefore) : undefined,
        },
      ),
    );
    for (const item of result) {
      const transactionId = item.signature;
      backTransactionsIds.push(transactionId);
      if (backTransactionsIds.length >= maxResultLength) {
        return { backwardTransactionsIds: backTransactionsIds };
      }
      if (transactionId === rewindUntil) {
        return { backwardTransactionsIds: backTransactionsIds };
      }
      startBefore = transactionId;
    }
    if (result.length < requestLimit) {
      return { backwardTransactionsIds: backTransactionsIds };
    }
  }
}

const resultJsonDecoder = jsonDecoderArray(
  jsonDecoderObject({ signature: jsonCodecSignature.decoder }),
);
