import { base64Encode } from "../data/Base64";
import { BlockHash, blockHashFromBytes } from "../data/Block";
import { Instruction } from "../data/Instruction";
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
  jsonDecoderObject,
  jsonDecoderOptional,
} from "../data/Json";
import { messageCompile, messageSign } from "../data/Message";
import { Pubkey, pubkeyDefault } from "../data/Pubkey";
import { signatureFromBytes } from "../data/Signature";
import { Signer } from "../data/Signer";
import { RpcHttp } from "./RpcHttp";
import { RpcTransactionExecution } from "./RpcTransaction";

export async function rpcHttpSimulateInstructions(
  rpcHttp: RpcHttp,
  instructions: Array<Instruction>,
  context:
    | { payerAddress: Pubkey }
    | {
        payerSigner: Signer;
        extraSigners?: Array<Signer>;
        recentBlockHash: BlockHash;
        // TODO - support for LUTs ?
      },
  options?: {
    simulatedAccountsAddresses?: Set<Pubkey>;
  },
): Promise<{
  transactionExecution: RpcTransactionExecution;
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
  const instructionsAddresses = new Set<Pubkey>();
  for (const instruction of instructions) {
    instructionsAddresses.add(instruction.programAddress);
    for (const input of instruction.inputs) {
      instructionsAddresses.add(input.address);
    }
  }
  const signers = new Array<Signer>();
  let payerSigner: Signer;
  let recentBlockHash: BlockHash;
  let replaceRecentBlockhash: boolean;
  let sigVerify: boolean;
  if ("payerSigner" in context) {
    signers.push(context.payerSigner);
    if (context.extraSigners !== undefined) {
      for (const signer of context.extraSigners) {
        signers.push(signer);
      }
    }
    payerSigner = context.payerSigner;
    recentBlockHash = context.recentBlockHash;
    replaceRecentBlockhash = false;
    sigVerify = true;
  } else {
    for (const instructionAddress of instructionsAddresses) {
      signers.push(signerFaked(instructionAddress));
    }
    payerSigner = signerFaked(context.payerAddress);
    recentBlockHash = blockHashFromBytes(new Uint8Array(32).fill(0));
    replaceRecentBlockhash = true;
    sigVerify = false;
  }
  const message = {
    payerAddress: payerSigner.address,
    instructions,
    recentBlockHash,
  };
  const messageCompiled = messageCompile(message);
  const messageSigned = await messageSign(messageCompiled, signers);
  const afterAccountsAddresses = options?.simulatedAccountsAddresses
    ? [...options.simulatedAccountsAddresses]
    : [];
  const result = resultJsonDecoder(
    await rpcHttp("simulateTransaction", [base64Encode(messageSigned)], {
      encoding: "base64",
      accounts: {
        addresses: afterAccountsAddresses.map(jsonCodecPubkey.encoder),
        encoding: "base64",
      },
      innerInstructions: false,
      replaceRecentBlockhash,
      sigVerify,
    }),
  );
  const transactionExecution = {
    blockInfo: {
      time: undefined,
      slot: result.context.slot,
    },
    message,
    logs: result.value.logs,
    error: result.value.err,
    consumedComputeUnits: result.value.unitsConsumed,
    chargedFeesLamports: BigInt(result.value.fee),
  };
  const afterAccountsByAddress = new Map(
    afterAccountsAddresses.map((afterAccountAddress, afterAccountIndex) => {
      const afterAccountInfo = result.value.accounts?.[afterAccountIndex];
      return [
        afterAccountAddress,
        afterAccountInfo
          ? {
              executable: afterAccountInfo.executable,
              lamports: BigInt(afterAccountInfo.lamports),
              owner: afterAccountInfo.owner,
              data: afterAccountInfo.data.bytes,
            }
          : {
              executable: false,
              lamports: 0n,
              owner: pubkeyDefault,
              data: new Uint8Array(0),
            },
      ];
    }),
  );
  return {
    transactionExecution,
    simulatedAccountInfoByAddress: afterAccountsByAddress,
  };
}

const resultJsonDecoder = jsonDecoderObject({
  context: jsonDecoderObject({ slot: jsonCodecBlockSlot.decoder }),
  value: jsonDecoderObject({
    unitsConsumed: jsonCodecNumber.decoder,
    fee: jsonCodecNumber.decoder,
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

function signerFaked(address: Pubkey): Signer {
  return {
    address,
    sign: async () => signatureFromBytes(new Uint8Array(64).fill(0)),
  };
}
