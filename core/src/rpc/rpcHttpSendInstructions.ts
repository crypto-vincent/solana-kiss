import { base64Encode } from "../data/base64";
import { jsonTypeString } from "../data/json";
import { messageCompile, messageSign } from "../data/message";
import { Signer } from "../data/signer";
import { Commitment, Hash, Instruction, Slot } from "../types";
import { RpcHttp } from "./rpcHttp";

export async function rpcHttpSendInstructions(
  rpcHttp: RpcHttp,
  payer: Signer,
  instructions: Array<Instruction>,
  recentBlockInfo: { slot: Slot; hash: Hash },
  options?: {
    extraSigners?: Array<Signer>;
    skipPreflight?: boolean;
  },
  context?: {
    commitment?: Commitment;
  },
) {
  // TODO - figure out how to handle recentBlockInfo that is too new/old/cached
  const signers = [payer, ...(options?.extraSigners ?? [])];
  const messageCompiled = messageCompile({
    payerAddress: payer.address,
    instructions,
    recentBlockHash: recentBlockInfo.hash,
  });
  const messageSigned = await messageSign(messageCompiled, signers);
  const result = resultJsonType.decode(
    await rpcHttp("sendTransaction", [
      base64Encode(messageSigned),
      {
        skipPreflight: options?.skipPreflight,
        preflightCommitment: context?.commitment,
        minContextSlot: recentBlockInfo.slot,
        encoding: "base64",
      },
    ]),
  );
  return result;
}

const resultJsonType = jsonTypeString();
