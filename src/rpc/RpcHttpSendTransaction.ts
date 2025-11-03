import { base64Encode } from "../data/Base64";
import {
  jsonCodecBlockSlot,
  jsonCodecNumber,
  jsonCodecRaw,
  jsonCodecSignature,
  jsonCodecString,
  jsonDecoderArray,
  jsonDecoderNullable,
  jsonDecoderObject,
} from "../data/Json";
import {
  transactionExtractSigning,
  TransactionHandle,
  TransactionPacket,
} from "../data/Transaction";
import { RpcHttp } from "./RpcHttp";

export async function rpcHttpSendTransaction(
  rpcHttp: RpcHttp,
  transactionPacket: TransactionPacket,
  options?: {
    skipAlreadySentCheck?: boolean;
    skipPreflight?: boolean;
  },
): Promise<{ transactionHandle: TransactionHandle }> {
  if (options?.skipAlreadySentCheck !== true) {
    // TODO - find a better way to check already sent transactions ?
    const transactionSigning = transactionExtractSigning(transactionPacket);
    const transactionHandle = transactionSigning[0]!.signature;
    if (await wasAlreadySent(rpcHttp, transactionHandle)) {
      return { transactionHandle };
    }
  }
  const transactionHandle = jsonCodecSignature.decoder(
    await rpcHttp(
      "sendTransaction",
      [base64Encode(transactionPacket as Uint8Array)],
      { skipPreflight: options?.skipPreflight, encoding: "base64" },
    ),
  );
  return { transactionHandle };
}

async function wasAlreadySent(
  rpcHttp: RpcHttp,
  transactionHandle: TransactionHandle,
) {
  const immediateStatus = await signatureStatus(rpcHttp, transactionHandle);
  if (immediateStatus !== null) {
    return true;
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const laterStatus = await signatureStatus(rpcHttp, transactionHandle);
  if (laterStatus) {
    return true;
  }
  return false;
}

async function signatureStatus(
  rpcHttp: RpcHttp,
  transactionHandle: TransactionHandle,
) {
  const statuses = statusesJsonDecoder(
    await rpcHttp("getSignatureStatuses", [[transactionHandle]], {
      searchTransactionHistory: false,
    }),
  );
  return statuses.value[0] ?? null;
}

const statusesJsonDecoder = jsonDecoderObject({
  context: jsonDecoderObject({
    slot: jsonCodecBlockSlot.decoder,
  }),
  value: jsonDecoderArray(
    jsonDecoderNullable(
      jsonDecoderObject({
        slot: jsonCodecBlockSlot.decoder,
        confirmations: jsonDecoderNullable(jsonCodecNumber.decoder),
        err: jsonDecoderNullable(jsonCodecRaw.decoder),
        confirmationStatus: jsonDecoderNullable(jsonCodecString.decoder),
      }),
    ),
  ),
});
