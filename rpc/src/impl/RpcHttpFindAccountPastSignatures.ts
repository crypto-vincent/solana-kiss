import {
  jsonDecoderArray,
  jsonDecoderObject,
  jsonDecodeString,
  Pubkey,
  Signature,
} from "solana-kiss-data";
import { RpcHttp } from "./RpcHttp";
import { Commitment } from "./RpcTypes";

export async function rpcHttpFindAccountPastSignatures(
  rpcHttp: RpcHttp,
  accountAddress: Pubkey,
  maxLength: number,
  pagination?: {
    startBeforeSignature?: Signature;
    rewindUntilSignature?: Signature;
  },
  context?: {
    commitment?: Commitment;
  },
): Promise<Array<Signature>> {
  const requestLimit = 1000;
  const signatures = new Array<Signature>();
  const rewindUntilSignature = pagination?.rewindUntilSignature;
  let startBeforeSignature = pagination?.startBeforeSignature;
  while (true) {
    const result = resultDecode(
      await rpcHttp("getSignaturesForAddress", [
        accountAddress,
        {
          limit: requestLimit,
          before: startBeforeSignature,
          commitment: context?.commitment,
        },
      ]),
    );
    for (const item of result) {
      const signature = item.signature;
      signatures.push(signature);
      if (signatures.length >= maxLength) {
        return signatures;
      }
      if (rewindUntilSignature && signature === rewindUntilSignature) {
        return signatures;
      }
      startBeforeSignature = signature;
    }
    if (result.length < requestLimit) {
      return signatures;
    }
  }
}

const resultDecode = jsonDecoderArray(
  jsonDecoderObject({
    signature: jsonDecodeString,
  }),
);
