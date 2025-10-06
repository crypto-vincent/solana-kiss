import { expect, it } from "@jest/globals";
import {
  Keypair,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  blockhashFromBytes,
  keypairFromSecret,
  messageCompile,
  messageSign,
  Pubkey,
  pubkeyNewDummy,
} from "../src";

it("run", async () => {
  const payerReference = Keypair.fromSecretKey(payerSecret);
  const signer1Reference = Keypair.fromSecretKey(signer1Secret);
  const signer2Reference = Keypair.fromSecretKey(signer2Secret);
  const payerCurrent = await keypairFromSecret(payerSecret);
  const signer1Current = await keypairFromSecret(signer1Secret);
  const signer2Current = await keypairFromSecret(signer2Secret);
  const blockHash = blockhashFromBytes(new Uint8Array(32).fill(42));
  const generatedInstruction1 = generateInstruction(
    signer1Reference.publicKey.toBase58() as Pubkey,
    signer2Current.address,
  );
  const generatedInstruction2 = generateInstruction(
    signer1Current.address,
    signer2Reference.publicKey.toBase58() as Pubkey,
  );
  const referenceCompiledMessage = new TransactionMessage({
    payerKey: payerReference.publicKey,
    recentBlockhash: blockHash as string,
    instructions: [
      generatedInstruction1.reference,
      generatedInstruction2.reference,
    ],
  }).compileToV0Message([]); // TODO - handle address lookup tables
  const referenceSignedMessage = new VersionedTransaction(
    referenceCompiledMessage,
  );
  referenceSignedMessage.sign([
    payerReference,
    signer1Reference,
    signer2Reference,
  ]);
  const referenceCompiledBytes = referenceCompiledMessage.serialize();
  const currentCompiledBytes = messageCompile({
    payerAddress: payerCurrent.address,
    instructions: [
      generatedInstruction1.current,
      generatedInstruction2.current,
    ],
    recentBlockhash: blockHash,
  });
  expect(currentCompiledBytes).toStrictEqual(referenceCompiledBytes);
  const referenceSignedBytes = referenceSignedMessage.serialize();
  const currentSignedBytes = await messageSign(currentCompiledBytes, [
    payerCurrent,
    signer1Current,
    signer2Current,
  ]);
  expect(currentSignedBytes).toStrictEqual(referenceSignedBytes);
});

function generateInstruction(
  signerWritableAddress: Pubkey,
  signerReadonlyAddress: Pubkey,
) {
  const programAddress = pubkeyNewDummy();
  const writableAddress = pubkeyNewDummy();
  const readonlyAddress = pubkeyNewDummy();
  const data = new Uint8Array(10);
  for (let index = 0; index < data.length; index++) {
    data[index] = Math.floor(Math.random() * 256);
  }
  const reference = {
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
  const current = {
    programAddress,
    inputs: [
      { address: signerWritableAddress, signing: true, writable: true },
      { address: signerReadonlyAddress, signing: true, writable: false },
      { address: writableAddress, signing: false, writable: true },
      { address: readonlyAddress, signing: false, writable: false },
    ],
    data,
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
