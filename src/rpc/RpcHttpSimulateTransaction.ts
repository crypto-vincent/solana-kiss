import { base64Encode } from "../data/Base64";
import {
  jsonCodecBlockSlot,
  jsonCodecBoolean,
  jsonCodecBytesBase64,
  jsonCodecNumber,
  jsonCodecPubkey,
  jsonCodecRaw,
  jsonCodecString,
  jsonDecoderArray,
  jsonDecoderArrayToObject,
  jsonDecoderConst,
  jsonDecoderNullable,
  jsonDecoderObject,
  jsonDecoderOptional,
} from "../data/Json";
import { Pubkey, pubkeyDefault } from "../data/Pubkey";
import { TransactionExecution, TransactionPacket } from "../data/Transaction";
import { RpcHttp } from "./RpcHttp";

export async function rpcHttpSimulateInstructions(
  rpcHttp: RpcHttp,
  transactionPacket: TransactionPacket,
  options?: {
    verifySignaturesAndBlockHash?: boolean;
    simulatedAccountsAddresses?: Set<Pubkey>;
  },
): Promise<{
  transactionExecution: TransactionExecution;
  simulatedAccountInfoByAddress: Map<
    Pubkey,
    {
      executable: boolean;
      lamports: bigint;
      owner: Pubkey;
      data: Uint8Array;
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
    await rpcHttp(
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
    blockInfo: {
      time: undefined,
      slot: result.context.slot,
    },
    logs: result.value.logs,
    error: result.value.err,
    consumedComputeUnits: result.value.unitsConsumed,
    chargedFeesLamports: result.value.fee
      ? BigInt(result.value.fee)
      : undefined,
  };
  const simulatedAccountInfoByAddress = new Map(
    simulatedAccountsAddresses.map(
      (simulatedAccountAddress, simulatedAccountIndex) => {
        const simulatedAccountInfo =
          result.value.accounts?.[simulatedAccountIndex];
        return [
          simulatedAccountAddress,
          simulatedAccountInfo
            ? {
                executable: simulatedAccountInfo.executable,
                lamports: BigInt(simulatedAccountInfo.lamports),
                owner: simulatedAccountInfo.owner,
                data: simulatedAccountInfo.data.bytes,
              }
            : {
                executable: false,
                lamports: 0n,
                owner: pubkeyDefault,
                data: new Uint8Array(0),
              },
        ];
      },
    ),
  );
  return { transactionExecution, simulatedAccountInfoByAddress };
}

const resultJsonDecoder = jsonDecoderObject({
  context: jsonDecoderObject({ slot: jsonCodecBlockSlot.decoder }),
  value: jsonDecoderObject({
    unitsConsumed: jsonCodecNumber.decoder,
    fee: jsonDecoderNullable(jsonCodecNumber.decoder),
    err: jsonCodecRaw.decoder,
    logs: jsonDecoderOptional(jsonDecoderArray(jsonCodecString.decoder)),
    accounts: jsonDecoderOptional(
      jsonDecoderArray(
        jsonDecoderOptional(
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
