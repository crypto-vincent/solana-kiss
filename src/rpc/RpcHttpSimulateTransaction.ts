import { base64Encode } from "../data/Base64";
import {
  jsonCodecBase64ToBytes,
  jsonCodecBlockSlot,
  jsonCodecBoolean,
  jsonCodecNumber,
  jsonCodecPubkey,
  jsonCodecString,
  jsonDecoderArrayToArray,
  jsonDecoderArrayToObject,
  jsonDecoderByType,
  jsonDecoderConst,
  jsonDecoderNullable,
  jsonDecoderObjectToObject,
  JsonObject,
} from "../data/Json";
import { Pubkey, pubkeyDefault } from "../data/Pubkey";
import { TransactionExecution, TransactionPacket } from "../data/Transaction";
import { RpcHttp } from "./RpcHttp";

/**
 * Simulates a transaction against the current cluster state without broadcasting it.
 *
 * Optionally fetches the post-simulation state of up to 3 accounts (Solana RPC limit).
 *
 * @param self - The {@link RpcHttp} client to use.
 * @param transactionPacket - The compiled and signed transaction bytes to simulate.
 * @param options - Optional simulation options.
 * @param options.verifySignaturesAndBlockHash - When `true` (default), verifies signatures and the blockhash before simulation.
 *   When `false`, the blockhash is replaced with a recent one and signature verification is skipped.
 * @param options.simulatedAccountsAddresses - An optional set of up to 3 account addresses whose post-simulation
 *   state should be returned.
 * @returns An object containing:
 *   - `transactionExecution` – execution result including logs, error, compute units, and fees.
 *   - `simulatedAccountsByAddress` – a map from each requested account address to its post-simulation state.
 * @throws If more than 3 accounts are requested via `simulatedAccountsAddresses`.
 */
export async function rpcHttpSimulateTransaction(
  self: RpcHttp,
  transactionPacket: TransactionPacket,
  options?: {
    verifySignaturesAndBlockHash?: boolean; // TODO - this could be split into 2 flags ?
    simulatedAccountsAddresses?: Set<Pubkey>;
  },
): Promise<{
  transactionExecution: TransactionExecution;
  simulatedAccountsByAddress: Map<
    Pubkey,
    {
      programAddress: Pubkey;
      accountExecutable: boolean;
      accountLamports: bigint;
      accountData: Uint8Array;
    }
  >;
}> {
  if ((options?.simulatedAccountsAddresses?.size ?? 0) > 3) {
    throw new Error("RpcHttp: fetchAccountsAddresses max size is 3");
  }
  const simulatedAccountsAddresses = options?.simulatedAccountsAddresses
    ? [...options.simulatedAccountsAddresses]
    : [];
  const verifySignaturesAndBlockHash =
    options?.verifySignaturesAndBlockHash ?? true;
  const result = resultJsonDecoder(
    await self(
      "simulateTransaction",
      [base64Encode(transactionPacket as Uint8Array)],
      {
        encoding: "base64",
        accounts: {
          addresses: simulatedAccountsAddresses.map(jsonCodecPubkey.encoder),
          encoding: "base64",
        },
        innerInstructions: false,
        replaceRecentBlockhash: !verifySignaturesAndBlockHash,
        sigVerify: verifySignaturesAndBlockHash,
      },
    ),
  );
  const transactionExecution: TransactionExecution = {
    blockTime: undefined,
    blockSlot: result.context.slot,
    transactionLogs: result.value.logs ?? undefined,
    transactionError: result.value.err,
    consumedComputeUnits: result.value.unitsConsumed,
    chargedFeesLamports: result.value.fee
      ? BigInt(result.value.fee)
      : undefined,
  };
  const simulatedAccountsByAddress = new Map(
    simulatedAccountsAddresses.map(
      (simulatedAccountAddress, simulatedAccountIndex) => {
        const simulatedAccountWithData =
          result.value.accounts?.[simulatedAccountIndex];
        return [
          simulatedAccountAddress,
          simulatedAccountWithData
            ? {
                programAddress: simulatedAccountWithData.owner,
                accountExecutable: simulatedAccountWithData.executable,
                accountLamports: BigInt(simulatedAccountWithData.lamports),
                accountData: simulatedAccountWithData.data.bytes,
              }
            : {
                programAddress: pubkeyDefault,
                accountExecutable: false,
                accountLamports: 0n,
                accountData: new Uint8Array(0),
              },
        ];
      },
    ),
  );
  return {
    transactionExecution,
    simulatedAccountsByAddress,
  };
}

const resultJsonDecoder = jsonDecoderObjectToObject({
  context: jsonDecoderObjectToObject({ slot: jsonCodecBlockSlot.decoder }),
  value: jsonDecoderObjectToObject({
    unitsConsumed: jsonCodecNumber.decoder,
    fee: jsonDecoderNullable(jsonCodecNumber.decoder),
    err: jsonDecoderByType<null | string | JsonObject>({
      null: () => null,
      string: (string) => string,
      object: (object) => object,
    }),
    logs: jsonDecoderNullable(jsonDecoderArrayToArray(jsonCodecString.decoder)),
    accounts: jsonDecoderNullable(
      jsonDecoderArrayToArray(
        jsonDecoderByType({
          null: () => null,
          object: jsonDecoderObjectToObject({
            executable: jsonCodecBoolean.decoder,
            lamports: jsonCodecNumber.decoder,
            owner: jsonCodecPubkey.decoder,
            data: jsonDecoderArrayToObject({
              bytes: jsonCodecBase64ToBytes.decoder,
              encoding: jsonDecoderConst("base64"),
            }),
          }),
        }),
      ),
    ),
  }),
});
