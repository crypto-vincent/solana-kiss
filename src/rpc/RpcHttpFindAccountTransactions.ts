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
): Promise<{ transactionsIds: Array<Signature> }> {
  const requestLimit = 1000;
  const transactionsIds = new Array<Signature>();
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
      transactionsIds.push(transactionId);
      if (transactionsIds.length >= maxResultLength) {
        return { transactionsIds };
      }
      if (transactionId === rewindUntil) {
        return { transactionsIds };
      }
      startBefore = transactionId;
    }
    if (result.length < requestLimit) {
      return { transactionsIds };
    }
  }
}

const resultJsonDecoder = jsonDecoderArray(
  jsonDecoderObject({ signature: jsonCodecSignature.decoder }),
);
