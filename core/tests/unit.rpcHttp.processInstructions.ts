import { it } from "@jest/globals";
import {
  Keypair,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  Instruction,
  pubkeyNewDummy,
  RpcHttp,
  rpcHttpGetTransaction,
} from "../src";

it("run", async () => {
  const payer = new Keypair();
  const signer = new Keypair();

  const blockHash = pubkeyNewDummy();
  const generatedInstruction1 = generateInstruction();
  const generatedInstruction2 = generateInstruction();

  const referenceMessage = new TransactionMessage({
    payerKey: payer.publicKey,
    recentBlockhash: blockHash,
    instructions: [
      generatedInstruction1.reference,
      generatedInstruction2.reference,
    ],
  }).compileToV0Message([]); // TODO - handle lookup tables

  const referenceMessageBytes = referenceMessage.serialize();
  console.log("referenceMessageBytes", referenceMessageBytes);

  const currentMessageBytes = compileTransaction(
    payer.publicKey.toBase58(),
    [generatedInstruction1.current, generatedInstruction2.current],
    blockHash,
  );
  console.log("currentMessageBytes", currentMessageBytes);
  expect(currentMessageBytes).toStrictEqual(referenceMessageBytes);

  const referenceTransaction = new VersionedTransaction(referenceMessage);
  referenceTransaction.sign([payer, signer]);

  const referenceTransactionBytes = referenceTransaction.serialize();
  console.log("referenceTransactionBytes", referenceTransactionBytes.length);

  const rpcHttp: RpcHttp = async (method, _params) => {
    if (method === "sendTransaction") {
      return { signature: "?" };
    }
    return {};
  };
  const dudu = await rpcHttpGetTransaction(rpcHttp, "!");
  console.log("dudu", JSON.stringify(dudu, null, 2));
});

function generateInstruction() {
  const programAddress = pubkeyNewDummy();
  const signerWritableAddress = pubkeyNewDummy();
  const signerReadonlyAddress = pubkeyNewDummy();
  const writableAddress = pubkeyNewDummy();
  const readonlyAddress = pubkeyNewDummy();
  const data = new Uint8Array(10);
  for (let index = 0; index < data.length; index++) {
    data[index] = Math.floor(Math.random() * 256);
  }
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
