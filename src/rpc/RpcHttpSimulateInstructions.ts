import { base64Encode } from "../data/Base64";
import { BlockHash, blockHashFromBytes } from "../data/Block";
import { Instruction } from "../data/Instruction";
import {
  jsonDecoderArray,
  jsonDecoderArrayToObject,
  jsonDecoderConst,
  jsonDecoderObject,
  jsonDecoderOptional,
  jsonTypeBlockHash,
  jsonTypeBoolean,
  jsonTypeBytesBase64,
  jsonTypeInteger,
  jsonTypeNumber,
  jsonTypePubkey,
  jsonTypeString,
  jsonTypeValue,
} from "../data/Json";
import { messageCompile, messageSign } from "../data/Message";
import { Pubkey, pubkeyToBase58 } from "../data/Pubkey";
import { signatureFromBytes } from "../data/Signature";
import { Signer } from "../data/Signer";
import { RpcHttp } from "./RpcHttp";

// TODO - support for simulateTransaction
// TODO - provide a higher level function that handle block hash and wait for confirmation
export async function rpcHttpSimulateInstructions(
  rpcHttp: RpcHttp,
  instructions: Array<Instruction>,
  context:
    | { payerAddress: Pubkey }
    | {
        payerSigner: Signer;
        extraSigners?: Array<Signer>;
        recentBlockHash: BlockHash;
      },
  afterExecutionFetchAccounts?: Set<Pubkey>,
): Promise<void> {
  if ((afterExecutionFetchAccounts?.size ?? 0) > 3) {
    throw new Error(
      "RpcHttp: afterExecutionFetchAccounts max size is 3 for now",
    );
  }
  const instructionsAddresses = new Set<Pubkey>();
  for (const instruction of instructions) {
    instructionsAddresses.add(instruction.programAddress);
    for (const input of instruction.inputs) {
      instructionsAddresses.add(input.address);
    }
  }
  console.log("all", instructionsAddresses);
  let replaceRecentBlockhash: boolean;
  let sigVerify: boolean;
  let payerSigner: Signer;
  let recentBlockHash: BlockHash;
  const signers = new Array<Signer>();
  if ("payerSigner" in context) {
    payerSigner = context.payerSigner;
    signers.push(context.payerSigner);
    if (context.extraSigners !== undefined) {
      for (const signer of context.extraSigners) {
        signers.push(signer);
      }
    }
    recentBlockHash = context.recentBlockHash;
    replaceRecentBlockhash = false;
    sigVerify = true;
  } else {
    payerSigner = signerFaked(context.payerAddress);
    for (const instructionAddress of instructionsAddresses) {
      signers.push(signerFaked(instructionAddress));
    }
    recentBlockHash = blockHashFromBytes(new Uint8Array(32).fill(0));
    replaceRecentBlockhash = true;
    sigVerify = false;
  }
  const messageCompiled = messageCompile({
    payerAddress: payerSigner.address,
    instructions,
    recentBlockHash,
  });
  const messageSigned = await messageSign(messageCompiled, signers);
  const requestedAddresses = afterExecutionFetchAccounts
    ? [...afterExecutionFetchAccounts]
    : [];
  const result = jsonTypeValue.decoder(
    await rpcHttp("simulateTransaction", [base64Encode(messageSigned)], {
      encoding: "base64",
      innerInstructions: true,
      accounts: {
        addresses: requestedAddresses.map((a) => pubkeyToBase58(a)),
        encoding: "base64",
      },
      replaceRecentBlockhash,
      sigVerify,
    }),
  );
  console.log(result);
  console.log("results", (result as any)["value"]["accounts"]);
  const dudu = resultJsonDecoder(result);

  const fetchedAccounts = new Map<
    Pubkey,
    null | {
      data: Uint8Array;
      owner: Pubkey;
      lamports: bigint;
      executable: boolean;
    }
  >();
  for (let index = 0; index < requestedAddresses.length; index++) {
    const requestedAddress = requestedAddresses[index]!;
    const fetchedAccountInfo = dudu.value.accounts[index]!;
    fetchedAccounts.set(
      requestedAddress,
      fetchedAccountInfo === null
        ? null
        : {
            data: fetchedAccountInfo.data.bytes,
            owner: fetchedAccountInfo.owner,
            lamports: fetchedAccountInfo.lamports,
            executable: fetchedAccountInfo.executable,
          },
    );
  }

  console.log("dudu", dudu);
  console.log("fetchedAccounts", fetchedAccounts);
  // TODO - finish return type
}

function signerFaked(address: Pubkey): Signer {
  return {
    address,
    sign: async () => signatureFromBytes(new Uint8Array(64).fill(0)),
  };
}

const resultJsonDecoder = jsonDecoderObject((key) => key, {
  context: jsonDecoderObject((key) => key, {
    slot: jsonTypeValue.decoder,
  }),
  value: jsonDecoderObject((key) => key, {
    err: jsonTypeValue.decoder,
    logs: jsonDecoderOptional(jsonDecoderArray(jsonTypeString.decoder)),
    accounts: jsonDecoderArray(
      jsonDecoderOptional(
        jsonDecoderObject((key) => key, {
          data: jsonDecoderArrayToObject({
            bytes: jsonTypeBytesBase64.decoder,
            encoding: jsonDecoderConst("base64"),
          }),
          executable: jsonTypeBoolean.decoder,
          lamports: jsonTypeInteger.decoder,
          owner: jsonTypePubkey.decoder,
        }),
      ),
    ),
    unitsConsumed: jsonTypeNumber.decoder,
    innerInstructions: jsonTypeValue.decoder,
    replacementBlockhash: jsonDecoderOptional(
      jsonDecoderObject((key) => key, {
        blockhash: jsonTypeBlockHash.decoder,
      }),
    ),
  }),
});
