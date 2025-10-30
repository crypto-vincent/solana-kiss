import { expect, it } from "@jest/globals";
import {
  Keypair,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  blockHashFromBytes,
  blockHashToBase58,
  Pubkey,
  pubkeyFromBase58,
  pubkeyNewDummy,
  signerFromSecret,
  transactionCompileAndSign,
  transactionDecompileRequest,
  transactionExtractMessage,
} from "../src";

it("run", async () => {
  const payerReference = Keypair.fromSecretKey(payerSecret);
  const signer1Reference = Keypair.fromSecretKey(signer1Secret);
  const signer2Reference = Keypair.fromSecretKey(signer2Secret);
  const payerCurrent = await signerFromSecret(payerSecret);
  const signer1Current = await signerFromSecret(signer1Secret);
  const signer2Current = await signerFromSecret(signer2Secret);
  const blockHash = blockHashFromBytes(new Uint8Array(32).fill(42));
  const generatedInstruction1 = generateInstruction(
    pubkeyFromBase58(signer1Reference.publicKey.toBase58()),
    signer2Current.address,
    22,
  );
  const generatedInstruction2 = generateInstruction(
    signer1Current.address,
    pubkeyFromBase58(signer2Reference.publicKey.toBase58()),
    170,
  );
  const dummyProgramAddress = pubkeyNewDummy();
  const generatedDummyInstructions = [];
  for (let count = 0; count < 155; count++) {
    generatedDummyInstructions.push(
      generateInstructionDummy(dummyProgramAddress),
    );
  }
  const referenceTransactionMessage = new TransactionMessage({
    payerKey: payerReference.publicKey,
    recentBlockhash: blockHashToBase58(blockHash),
    instructions: [
      generatedInstruction1.reference,
      generatedInstruction2.reference,
      ...generatedDummyInstructions.map((ix) => ix.reference),
    ],
  }).compileToV0Message([]);
  const referenceTransaction = new VersionedTransaction(
    referenceTransactionMessage,
  );
  referenceTransaction.sign([
    payerReference,
    signer1Reference,
    signer2Reference,
  ]);
  const referenceMessageBytes = referenceTransactionMessage.serialize();
  const referencePacketBytes = referenceTransaction.serialize();
  const currentRequest = {
    payerAddress: payerCurrent.address,
    recentBlockHash: blockHash,
    instructions: [
      generatedInstruction1.current,
      generatedInstruction2.current,
      ...generatedDummyInstructions.map((ix) => ix.current),
    ],
  };
  const currentPacket = await transactionCompileAndSign(
    [payerCurrent, signer1Current, signer2Current],
    currentRequest,
    [],
  );
  const currentMessage = transactionExtractMessage(currentPacket);
  expect(currentMessage).toStrictEqual(referenceMessageBytes);
  expect(currentPacket).toStrictEqual(referencePacketBytes);
  expect(transactionDecompileRequest(currentMessage)).toStrictEqual(
    currentRequest,
  );
});

function generateInstruction(
  signerWritableAddress: Pubkey,
  signerReadonlyAddress: Pubkey,
  dataLength: number,
) {
  const programAddress = pubkeyNewDummy();
  const writableAddress = pubkeyNewDummy();
  const readonlyAddress = pubkeyNewDummy();
  const data = new Uint8Array(dataLength);
  for (let index = 0; index < data.length; index++) {
    data[index] = Math.floor(Math.random() * 256);
  }
  function meta(address: Pubkey, isSigner: boolean, isWritable: boolean) {
    return {
      pubkey: new PublicKey(address),
      isSigner,
      isWritable,
    };
  }
  const reference = {
    programId: new PublicKey(programAddress),
    keys: [
      meta(signerWritableAddress, true, true),
      meta(signerReadonlyAddress, true, false),
      meta(writableAddress, false, true),
      meta(readonlyAddress, false, false),
    ],
    data: Buffer.from(data),
  };
  const current = {
    programAddress,
    inputs: [
      { address: signerWritableAddress, signer: true, writable: true },
      { address: signerReadonlyAddress, signer: true, writable: false },
      { address: writableAddress, signer: false, writable: true },
      { address: readonlyAddress, signer: false, writable: false },
    ],
    data,
  };
  return { reference, current };
}

function generateInstructionDummy(programAddress: Pubkey) {
  const reference = {
    programId: new PublicKey(programAddress),
    keys: [],
    data: Buffer.from([]),
  };
  const current = {
    programAddress,
    inputs: [],
    data: new Uint8Array([]),
  };
  return { reference, current };
}

const payerSecret = new Uint8Array([
  253, 106, 204, 143, 156, 225, 66, 188, 227, 208, 143, 26, 144, 47, 245, 32,
  217, 222, 212, 216, 243, 147, 179, 91, 179, 79, 3, 159, 237, 186, 36, 177, 62,
  57, 237, 150, 98, 58, 101, 43, 0, 142, 99, 249, 116, 205, 144, 75, 39, 143,
  146, 102, 197, 80, 18, 218, 155, 250, 102, 206, 200, 229, 228, 173,
]);

const signer1Secret = new Uint8Array([
  171, 28, 114, 39, 144, 135, 1, 166, 173, 135, 42, 210, 172, 128, 221, 232,
  160, 215, 176, 133, 242, 238, 11, 66, 97, 10, 29, 100, 249, 175, 211, 207, 44,
  42, 172, 237, 214, 43, 22, 174, 189, 154, 144, 125, 93, 82, 171, 9, 33, 36,
  150, 200, 48, 72, 213, 107, 196, 240, 172, 191, 90, 177, 222, 113,
]);

const signer2Secret = new Uint8Array([
  52, 154, 232, 185, 133, 75, 136, 109, 46, 226, 63, 173, 178, 166, 16, 131,
  115, 45, 28, 85, 225, 205, 66, 46, 188, 52, 97, 210, 250, 55, 141, 104, 7, 9,
  241, 79, 137, 12, 229, 135, 176, 19, 204, 162, 163, 173, 254, 45, 113, 98, 86,
  237, 171, 174, 65, 124, 12, 232, 220, 241, 143, 75, 109, 26,
]);
