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
