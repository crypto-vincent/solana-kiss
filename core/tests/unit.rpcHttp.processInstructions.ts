import { it } from "@jest/globals";
import {
  PublicKey,
  TransactionInstruction,
  VersionedMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  Instruction,
  pubkeyNewRandom,
  RpcHttp,
  rpcHttpGetTransactionExecution,
} from "../src";

it("run", async () => {
  const generated1 = generateIx();
  const generated2 = generateIx();

  const dd = new VersionedMessage();
  const referenceTx = new VersionedTransaction();
  referenceTx.add(generated1.reference);
  referenceTx.add(generated2.reference);

  const currentTx = {};

  const rpcHttp: RpcHttp = async (method, params) => {
    if (method === "sendTransaction") {
      return { signature: "?" };
    }
    return {};
  };
  const dudu = await rpcHttpGetTransactionExecution(rpcHttp, "!");
  console.log("dudu", JSON.stringify(dudu, null, 2));
});

function generateIx() {
  const programAddress = pubkeyNewRandom();
  const signerWritableAddress = pubkeyNewRandom();
  const signerReadonlyAddress = pubkeyNewRandom();
  const writableAddress = pubkeyNewRandom();
  const readonlyAddress = pubkeyNewRandom();
  const data = new Uint8Array(300);
  crypto.getRandomValues(data);
  const referenceIx: TransactionInstruction = {
    programId: new PublicKey(programAddress),
    keys: [
      {
        pubkey: new PublicKey(signerWritableAddress),
        isSigner: true,
        isWritable: true,
      },
      {
        pubkey: new PublicKey(signerReadonlyAddress),
        isSigner: true,
        isWritable: false,
      },
      {
        pubkey: new PublicKey(writableAddress),
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: new PublicKey(readonlyAddress),
        isSigner: false,
        isWritable: false,
      },
    ],
    data: Buffer.from(data),
  };
  const currentIx: Instruction = {
    programAddress,
    inputs: [
      { address: signerWritableAddress, signer: true, writable: true },
      { address: signerReadonlyAddress, signer: true, writable: false },
      { address: writableAddress, signer: false, writable: true },
      { address: readonlyAddress, signer: false, writable: false },
    ],
    data,
  };
  return {
    reference: referenceIx,
    current: currentIx,
  };
}
