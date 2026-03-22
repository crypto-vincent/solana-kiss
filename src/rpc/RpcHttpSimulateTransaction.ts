import { base64Encode } from "../data/Base64";
import { ExecutionReport } from "../data/Execution";
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
import {
  TransactionPacket,
  transactionPacketToBytes,
} from "../data/Transaction";
import { RpcHttp } from "./RpcHttp";

/**
 * Simulates a transaction without broadcasting it.
 * @param self - {@link RpcHttp} client.
 * @param transactionPacket - Transaction to simulate.
 * @param options.verifySignaturesAndBlockHash - Verify signatures/blockhash before simulation (default: `true`).
 * @param options.simulatedAccountsAddresses - Up to 3 accounts whose post-simulation state to return.
 * @returns `{ executionReport, simulatedAccountsByAddress }`.
 * @throws If more than 3 accounts are requested.
 */
export async function rpcHttpSimulateTransaction(
  self: RpcHttp,
  transactionPacket: TransactionPacket,
  options?: {
    verifySignaturesAndBlockHash?: boolean;
    simulatedAccountsAddresses?: Set<Pubkey>;
  },
): Promise<{
  executionReport: ExecutionReport;
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
    throw new Error("RpcHttp: simulatedAccountsAddresses max size is 3");
  }
  const simulatedAccountsAddresses = options?.simulatedAccountsAddresses
    ? [...options.simulatedAccountsAddresses]
    : [];
  const verifySignaturesAndBlockHash =
    options?.verifySignaturesAndBlockHash ?? true;
  const result = resultJsonDecoder(
    await self(
      "simulateTransaction",
      [base64Encode(transactionPacketToBytes(transactionPacket))],
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
  const executionReport: ExecutionReport = {
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
  return { executionReport, simulatedAccountsByAddress };
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
