import { base64Encode } from "../data/Base64";
import { BlockHash } from "../data/Block";
import { Instruction } from "../data/Instruction";
import { jsonCodecSignature } from "../data/Json";
import { messageCompile, messageSign } from "../data/Message";
import { Signature } from "../data/Signature";
import { Signer } from "../data/Signer";
import { RpcHttp } from "./RpcHttp";

// TODO (service) - provide a higher level function that handle block hash and wait for confirmation
export async function rpcHttpScheduleInstructions(
  rpcHttp: RpcHttp,
  instructions: Array<Instruction>,
  context: {
    payerSigner: Signer;
    extraSigners?: Array<Signer>;
    recentBlockHash: BlockHash;
    // TODO (ALT) - support LUTs ?
  },
  options?: {
    skipPreflight?: boolean;
  },
): Promise<{
  transactionId: Signature;
}> {
  const signers = [context.payerSigner, ...(context?.extraSigners ?? [])];
  const messageCompiled = messageCompile({
    payerAddress: context.payerSigner.address,
    instructions,
    recentBlockHash: context.recentBlockHash,
  });
  const messageSigned = await messageSign(messageCompiled, signers);
  const transactionId = jsonCodecSignature.decoder(
    await rpcHttp("sendTransaction", [base64Encode(messageSigned)], {
      skipPreflight: options?.skipPreflight,
      encoding: "base64",
    }),
  );
  return { transactionId };
}
