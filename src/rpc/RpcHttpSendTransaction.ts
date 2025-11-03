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
import { Signer } from "../data/Signer";
import {
  transactionExtractSigning,
  TransactionHandle,
  TransactionPacket,
  transactionSign,
} from "../data/Transaction";
import { WalletAccount } from "../data/Wallet";
import { RpcHttp } from "./RpcHttp";

// TODO (service) - provide a higher level function that handle block hash and wait for confirmation
export async function rpcHttpSendTransaction(
  rpcHttp: RpcHttp,
  transactionPacket: TransactionPacket,
  options?: {
    skipPreflight?: boolean;
    extraSigners?: Array<Signer>;
    walletAccountsSigners?: Array<WalletAccount>;
  },
): Promise<{ transactionHandle: TransactionHandle }> {
  if (options?.extraSigners !== undefined) {
    transactionPacket = await transactionSign(
      transactionPacket,
      options.extraSigners,
    );
  }
  if (options?.walletAccountsSigners !== undefined) {
    for (const walletAccount of options.walletAccountsSigners) {
      transactionPacket =
        await walletAccount.signTransaction(transactionPacket);
    }
    const transactionSigning = transactionExtractSigning(transactionPacket);
    const transactionHandle = transactionSigning[0]!.signature;
    if (await wasAlreadySentByWallet(rpcHttp, transactionHandle)) {
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

async function wasAlreadySentByWallet(
  rpcHttp: RpcHttp,
  transactionHandle: TransactionHandle,
): Promise<boolean> {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const statuses = statusesJsonDecoder(
    await rpcHttp("getSignatureStatuses", [[transactionHandle]], {
      searchTransactionHistory: false,
    }),
  );
  return statuses.value[0] !== null;
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
