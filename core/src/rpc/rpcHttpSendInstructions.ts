import { base64Encode } from "../data/Base64";
import { jsonTypeString } from "../data/Json";
import { messageCompile, messageSign } from "../data/Message";
import { Commitment, Hash, Instruction, Slot } from "../data/Onchain";
import { Signer } from "../data/Signer";
import { RpcHttp } from "./RpcHttp";

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
