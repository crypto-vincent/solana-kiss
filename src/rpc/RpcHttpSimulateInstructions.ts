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
import {
  Transaction,
  transactionLoadedAddressesJsonDecoder,
  transactionLogsMessagesJsonDecoder,
} from "../data/Transaction";
import { RpcHttp } from "./RpcHttp";

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
    afterAccountAddresses?: Set<Pubkey>;
  },
): Promise<{
  transaction: Transaction;
  afterAccountsByAddress: Map<
    Pubkey,
    {
      data: Uint8Array;
      owner: Pubkey;
      lamports: bigint;
      executable: boolean;
    }
  >;
}> {
  if ((options?.afterAccountAddresses?.size ?? 0) > 3) {
    throw new Error("RpcHttp: afterAccountAddresses max size is 3");
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
  const afterAccountsAddresses = options?.afterAccountAddresses
    ? [...options.afterAccountAddresses]
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
  const transaction = {
    block: {
      time: undefined,
      slot: result.context.slot,
    },
    message,
    chargedFeesLamports: BigInt(result.value.fee),
    consumedComputeUnits: result.value.unitsConsumed,
    error: result.value.err,
    logs: result.value.logs,
    invocations: undefined,
  };
  const afterAccountsByAddress = new Map(
    afterAccountsAddresses.map((afterAccountAddress, accountIndex) => {
      const afterAccount = result.value.accounts?.[accountIndex];
      return [
        afterAccountAddress,
        afterAccount
          ? {
              data: afterAccount.data.bytes,
              owner: afterAccount.owner,
              lamports: BigInt(afterAccount.lamports),
              executable: afterAccount.executable,
            }
          : {
              data: new Uint8Array(0),
              owner: pubkeyDefault,
              lamports: 0n,
              executable: false,
            },
      ];
    }),
  );
  return { transaction, afterAccountsByAddress };
}

function signerFaked(address: Pubkey): Signer {
  return {
    address,
    sign: async () => signatureFromBytes(new Uint8Array(64).fill(0)),
  };
}

const resultJsonDecoder = jsonDecoderObject({
  context: jsonDecoderObject({
    slot: jsonCodecBlockSlot.decoder,
  }),
  value: jsonDecoderObject({
    unitsConsumed: jsonCodecNumber.decoder,
    err: jsonCodecRaw.decoder,
    fee: jsonCodecNumber.decoder,
    loadedAddresses: transactionLoadedAddressesJsonDecoder,
    logs: transactionLogsMessagesJsonDecoder,
    accounts: jsonDecoderOptional(
      jsonDecoderArray(
        jsonDecoderOptional(
          jsonDecoderObject({
            data: jsonDecoderArrayToObject({
              bytes: jsonCodecBytesBase64.decoder,
              encoding: jsonDecoderConst("base64"),
            }),
            executable: jsonCodecBoolean.decoder,
            lamports: jsonCodecNumber.decoder,
            owner: jsonCodecPubkey.decoder,
          }),
        ),
      ),
    ),
  }),
});
