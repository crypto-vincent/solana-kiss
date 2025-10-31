import { base64Encode } from "../data/Base64";
import {
  jsonCodecSignature,
  jsonDecoderArray,
  jsonDecoderObject,
  jsonDecoderOptional,
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
    withExtraSigners?: Array<Signer>;
    withWalletAccountsSigners?: Array<WalletAccount>;
  },
): Promise<{ transactionHandle: TransactionHandle }> {
  if (options?.withExtraSigners !== undefined) {
    transactionPacket = await transactionSign(
      transactionPacket,
      options.withExtraSigners,
    );
  }
  if (options?.withWalletAccountsSigners !== undefined) {
    for (const walletAccount of options.withWalletAccountsSigners) {
      transactionPacket =
        await walletAccount.signTransaction(transactionPacket);
    }
    const transactionSigning = transactionExtractSigning(transactionPacket);
    const transactionHandle = transactionSigning[0]!.signature;
    await new Promise((resolve) => setTimeout(resolve, 500));
    const statuses = statusesJsonDecoder(
      await rpcHttp("getSignatureStatuses", [[transactionHandle]], {
        searchTransactionHistory: true,
      }),
    );
    if (statuses.value[0] !== null) {
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

// TODO - put this in a dedicated rpc function
const statusesJsonDecoder = jsonDecoderObject({
  context: jsonDecoderObject({}),
  value: jsonDecoderArray(jsonDecoderOptional(jsonDecoderObject({}))),
});
