import {
  jsonDecoderArray,
  jsonDecoderObject,
  jsonTypeSignature,
  Pubkey,
  pubkeyToBase58,
  Signature,
  signatureToBase58,
} from "solana-kiss-data";
import { RpcHttp } from "./RpcHttp";
import { Commitment } from "./RpcTypes";

export async function rpcHttpFindAccountPastSignatures(
  rpcHttp: RpcHttp,
  accountAddress: Pubkey,
  maxLength: number,
  pagination?: {
    startBefore?: Signature;
    rewindUntil?: Signature;
  },
  context?: {
    commitment?: Commitment;
  },
): Promise<Array<Signature>> {
  const requestLimit = 1000;
  const signatures = new Array<Signature>();
  const rewindUntil = pagination?.rewindUntil;
  let startBefore = pagination?.startBefore;
  while (true) {
    const result = resultJsonDecoder(
      await rpcHttp("getSignaturesForAddress", [
        pubkeyToBase58(accountAddress),
        {
          limit: requestLimit,
          before: startBefore ? signatureToBase58(startBefore) : undefined,
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
      if (signature === rewindUntil) {
        return signatures;
      }
      startBefore = signature;
    }
    if (result.length < requestLimit) {
      return signatures;
    }
  }
}

const resultJsonDecoder = jsonDecoderArray(
  jsonDecoderObject({
    signature: jsonTypeSignature.decoder,
  }),
);
