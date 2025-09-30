import { base64Encode } from "../data/base64";
import { jsonTypeString } from "../data/json";
import { messageCompile, messageSign } from "../data/message";
import { Signer } from "../data/signer";
import { Commitment, Hash, Instruction } from "../types";
import { RpcHttp } from "./rpcHttp";
import { rpcHttpGetLatestBlockHash } from "./rpcHttpGetLatestBlockHash";

export async function rpcHttpEnqueueInstructions(
  rpcHttp: RpcHttp,
  payer: Signer,
  instructions: Array<Instruction>,
  options?: {
    extraSigners?: Array<Signer>;
    recentBlockHash?: Hash;
  },
  context?: {
    commitment?: Commitment;
  },
) {
  const recentBlockHash =
    options?.recentBlockHash ??
    (await rpcHttpGetLatestBlockHash(rpcHttp, context));
  const signers = [payer, ...(options?.extraSigners ?? [])];
  const compiled = messageCompile({
    payerAddress: payer.address,
    instructions,
    recentBlockHash,
  });
  const signed = await messageSign(compiled, signers);
  const result = resultJsonType.decode(
    await rpcHttp("sendTransaction", [
      base64Encode(signed),
      {
        preflightCommitment: context?.commitment,
        encoding: "base64",
      },
    ]),
  );
  return result;
}

const resultJsonType = jsonTypeString();
