import { base64Encode } from "../data/Base64";
import { BlockHash, blockHashFromBytes } from "../data/Block";
import { innerInstructionsJsonDecoder, Instruction } from "../data/Instruction";
import {
  jsonDecoderArray,
  jsonDecoderArrayToObject,
  jsonDecoderConst,
  jsonDecoderObject,
  jsonDecoderOptional,
  jsonTypeBlockSlot,
  jsonTypeBoolean,
  jsonTypeBytesBase64,
  jsonTypeNumber,
  jsonTypePubkey,
  jsonTypeValue,
} from "../data/Json";
import { messageCompile, messageSign } from "../data/Message";
import { Pubkey, pubkeyToBase58 } from "../data/Pubkey";
import { signatureFromBytes } from "../data/Signature";
import { Signer } from "../data/Signer";
import {
  Transaction,
  transactionLoadedAddressesJsonDecoder,
  transactionLogsMessagesJsonDecoder,
} from "../data/Transaction";
import { RpcHttp } from "./RpcHttp";

// TODO - make sure we return a full Transaction object ?
export async function rpcHttpSimulateInstructions(
  rpcHttp: RpcHttp,
  instructions: Array<Instruction>,
  // TODO - support for LUTs ?
  context:
    | { payerAddress: Pubkey }
    | {
        payerSigner: Signer;
        extraSigners?: Array<Signer>;
        recentBlockHash: BlockHash;
      },
  options?: {
    postFetchAccountsAddresses?: Set<Pubkey>;
  },
): Promise<Transaction> {
  if ((options?.postFetchAccountsAddresses?.size ?? 0) > 3) {
    throw new Error("RpcHttp: postFetchAddresses max size is 3");
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
  const postFetchAddresses = options?.postFetchAccountsAddresses
    ? [...options.postFetchAccountsAddresses]
    : [];
  const result = resultJsonDecoder(
    await rpcHttp("simulateTransaction", [base64Encode(messageSigned)], {
      encoding: "base64",
      accounts: {
        addresses: postFetchAddresses.map((address) => pubkeyToBase58(address)),
        encoding: "base64",
      },
      innerInstructions: false, // TODO - what to do about this ?
      replaceRecentBlockhash,
      sigVerify,
    }),
  );

  const postFetchAccountsByAddress = new Map<
    Pubkey,
    {
      data: Uint8Array;
      owner: Pubkey;
      lamports: bigint;
      executable: boolean;
    }
  >();
  for (let index = 0; index < postFetchAddresses.length; index++) {
    const postFetchInfo = result.value.accounts?.[index];
    if (postFetchInfo) {
      postFetchAccountsByAddress.set(postFetchAddresses[index]!, {
        data: postFetchInfo.data.bytes,
        owner: postFetchInfo.owner,
        lamports: BigInt(postFetchInfo.lamports),
        executable: postFetchInfo.executable,
      });
    }
  }

  return {
    block: {
      time: undefined,
      slot: result.context.slot,
    },
    message,
    error: result.value.err,
    logs: result.value.logs,
    chargedFeesLamports: BigInt(result.value.fee),
    consumedComputeUnits: result.value.unitsConsumed,
    // postFetchAccountsByAddress,
    invocations: [],
    // TODO - decompile invokactions and inner instructions ?
  };
}

function signerFaked(address: Pubkey): Signer {
  return {
    address,
    sign: async () => signatureFromBytes(new Uint8Array(64).fill(0)),
  };
}

const resultJsonDecoder = jsonDecoderObject((key) => key, {
  context: jsonDecoderObject((key) => key, {
    slot: jsonTypeBlockSlot.decoder,
  }),
  value: jsonDecoderObject((key) => key, {
    unitsConsumed: jsonTypeNumber.decoder,
    err: jsonTypeValue.decoder,
    fee: jsonTypeNumber.decoder,
    innerInstructions: innerInstructionsJsonDecoder,
    loadedAddresses: transactionLoadedAddressesJsonDecoder,
    logs: transactionLogsMessagesJsonDecoder,
    accounts: jsonDecoderOptional(
      jsonDecoderArray(
        jsonDecoderOptional(
          jsonDecoderObject((key) => key, {
            data: jsonDecoderArrayToObject({
              bytes: jsonTypeBytesBase64.decoder,
              encoding: jsonDecoderConst("base64"),
            }),
            executable: jsonTypeBoolean.decoder,
            lamports: jsonTypeNumber.decoder,
            owner: jsonTypePubkey.decoder,
          }),
        ),
      ),
    ),
  }),
});
