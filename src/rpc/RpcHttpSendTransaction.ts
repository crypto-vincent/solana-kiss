import { base64Encode } from "../data/Base64";
import { jsonCodecSignature } from "../data/Json";
import { Signer } from "../data/Signer";
import {
  transactionExtractSigning,
  TransactionHandle,
  TransactionPacket,
  transactionSign,
} from "../data/Transaction";
import { WalletAccount } from "../data/Wallet";
import { RpcHttp } from "./RpcHttp";
import { rpcHttpGetTransaction } from "./RpcHttpGetTransaction";

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
    const startTimeMs = Date.now();
    while (Date.now() - startTimeMs < 1000) {
      const result = await rpcHttpGetTransaction(rpcHttp, transactionHandle, {
        skipTransactionFlow: true,
      });
      if (result !== undefined) {
        return { transactionHandle };
      }
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
