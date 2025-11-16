import { base64Encode } from "../data/Base64";
import {
  jsonCodecBlockSlot,
  jsonCodecBoolean,
  jsonCodecBytesBase64,
  jsonCodecNumber,
  jsonCodecPubkey,
  jsonCodecString,
  jsonDecoderArray,
  jsonDecoderArrayToObject,
  jsonDecoderByType,
  jsonDecoderConst,
  jsonDecoderNullable,
  jsonDecoderObject,
  jsonDecoderOptional,
  JsonObject,
} from "../data/Json";
import { Pubkey, pubkeyDefault } from "../data/Pubkey";
import { TransactionExecution, TransactionPacket } from "../data/Transaction";
import { RpcHttp } from "./RpcHttp";

export async function rpcHttpSimulateTransaction(
  self: RpcHttp,
  transactionPacket: TransactionPacket,
  options?: {
    verifySignaturesAndBlockHash?: boolean;
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
  const strictVerification = options?.verifySignaturesAndBlockHash ?? true;
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
        replaceRecentBlockhash: !strictVerification,
        sigVerify: strictVerification,
      },
    ),
  );
  const transactionExecution = {
    blockTime: undefined,
    blockSlot: result.context.slot,
    logs: result.value.logs,
    error: result.value.err,
    consumedComputeUnits: result.value.unitsConsumed,
    chargedFeesLamports: result.value.fee
      ? BigInt(result.value.fee)
      : undefined,
  };
  const simulatedAccountsByAddress = new Map(
    simulatedAccountsAddresses.map(
      (simulatedAccountAddress, simulatedAccountIndex) => {
        const simulatedAccountInfo =
          result.value.accounts?.[simulatedAccountIndex];
        return [
          simulatedAccountAddress,
          simulatedAccountInfo
            ? {
                programAddress: simulatedAccountInfo.owner,
                accountExecutable: simulatedAccountInfo.executable,
                accountLamports: BigInt(simulatedAccountInfo.lamports),
                accountData: simulatedAccountInfo.data.bytes,
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

const resultJsonDecoder = jsonDecoderObject({
  context: jsonDecoderObject({ slot: jsonCodecBlockSlot.decoder }),
  value: jsonDecoderObject({
    unitsConsumed: jsonCodecNumber.decoder,
    fee: jsonDecoderOptional(jsonCodecNumber.decoder),
    err: jsonDecoderNullable(
      jsonDecoderByType<string | JsonObject>({
        object: (object) => object,
        string: (string) => string,
      }),
    ),
    logs: jsonDecoderOptional(jsonDecoderArray(jsonCodecString.decoder)),
    accounts: jsonDecoderOptional(
      jsonDecoderArray(
        jsonDecoderNullable(
          jsonDecoderObject({
            executable: jsonCodecBoolean.decoder,
            lamports: jsonCodecNumber.decoder,
            owner: jsonCodecPubkey.decoder,
            data: jsonDecoderArrayToObject({
              bytes: jsonCodecBytesBase64.decoder,
              encoding: jsonDecoderConst("base64"),
            }),
          }),
        ),
      ),
    ),
  }),
});
