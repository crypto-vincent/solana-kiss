import { base64Encode } from "../data/Base64";
import { BlockHash } from "../data/Block";
import { Instruction } from "../data/Instruction";
import { jsonTypeSignature } from "../data/Json";
import { messageCompile, messageSign } from "../data/Message";
import { Signature } from "../data/Signature";
import { Signer } from "../data/Signer";
import { RpcHttp } from "./RpcHttp";

// TODO - support for simulateTransaction
// TODO - provide a higher level function that handle block hash and wait for confirmation
export async function rpcHttpSendInstructions(
  rpcHttp: RpcHttp,
  payerSigner: Signer,
  instructions: Array<Instruction>,
  recentBlockHash: BlockHash,
  options?: {
    extraSigners?: Array<Signer>;
    skipPreflight?: boolean;
  },
): Promise<Signature> {
  const signers = [payerSigner, ...(options?.extraSigners ?? [])];
  const messageCompiled = messageCompile({
    payerAddress: payerSigner.address,
    instructions,
    recentBlockHash: recentBlockHash,
  });
  const messageSigned = await messageSign(messageCompiled, signers);
  return jsonTypeSignature.decoder(
    await rpcHttp("sendTransaction", [base64Encode(messageSigned)], {
      skipPreflight: options?.skipPreflight,
      encoding: "base64",
    }),
  );
}
