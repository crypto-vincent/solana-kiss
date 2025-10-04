import {
  Blockhash,
  Instruction,
  Signature,
  Signer,
  base64Encode,
  jsonTypeString,
  messageCompile,
  messageSign,
} from "solana-kiss-data";
import { RpcHttp } from "./RpcHttp";
import { Commitment } from "./RpcTypes";

// TODO - provide a higher level function that handle blockhash and wait for confirmation
export async function rpcHttpSendInstructions(
  rpcHttp: RpcHttp,
  payerSigner: Signer,
  instructions: Array<Instruction>,
  recentBlockhash: Blockhash,
  options?: {
    extraSigners?: Array<Signer>;
    skipPreflight?: boolean;
  },
  context?: {
    commitment?: Commitment;
  },
): Promise<Signature> {
  const signers = [payerSigner, ...(options?.extraSigners ?? [])];
  const messageCompiled = messageCompile({
    payerAddress: payerSigner.address,
    instructions,
    recentBlockhash,
  });
  const messageSigned = await messageSign(messageCompiled, signers);
  return jsonTypeString.decoder(
    await rpcHttp("sendTransaction", [
      base64Encode(messageSigned),
      {
        skipPreflight: options?.skipPreflight,
        preflightCommitment: context?.commitment,
        commitment: context?.commitment,
        encoding: "base64",
      },
    ]),
  );
}
