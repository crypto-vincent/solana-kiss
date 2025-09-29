import { it } from "@jest/globals";
import {
  Keypair,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  base58Decode,
  base58Encode,
  Hash,
  Instruction,
  Pubkey,
  pubkeyNewRandom,
  RpcHttp,
  rpcHttpGetTransactionExecution,
} from "../src";

function flatten(chunks: Uint8Array[]): Uint8Array {
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);

  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

function compileTransaction(
  payer: Pubkey,
  instructions: Array<Instruction>,
  recentBlockhash: Hash,
) {
  const addressToMeta = new Map<
    Pubkey,
    { signer: boolean; writable: boolean; invoked: boolean }
  >();
  addressToMeta.set(payer, {
    signer: true,
    writable: true,
    invoked: false,
  });
  for (const instruction of instructions) {
    const programMeta = addressToMeta.get(instruction.programAddress) ?? {
      signer: false,
      writable: false,
      invoked: false,
    };
    programMeta.invoked = true;
    addressToMeta.set(instruction.programAddress, programMeta);
    for (const input of instruction.inputs) {
      const inputMeta = addressToMeta.get(input.address) ?? {
        signer: false,
        writable: false,
        invoked: false,
      };
      inputMeta.signer = inputMeta.signer || input.signer;
      inputMeta.writable = inputMeta.writable || input.writable;
      addressToMeta.set(input.address, inputMeta);
    }
  }

  const addressesWithMeta = [...addressToMeta.entries()];

  const writableSigners = addressesWithMeta.filter(
    ([, meta]) => meta.signer && meta.writable,
  );
  const readonlySigners = addressesWithMeta.filter(
    ([, meta]) => meta.signer && !meta.writable,
  );
  const writableNonSigners = addressesWithMeta.filter(
    ([, meta]) => !meta.signer && meta.writable,
  );
  const readonlyNonSigners = addressesWithMeta.filter(
    ([, meta]) => !meta.signer && !meta.writable,
  );

  const numRequiredSignatures = writableSigners.length + readonlySigners.length;
  const numReadonlySignedAccounts = readonlySigners.length;
  const numReadonlyUnsignedAccounts = readonlyNonSigners.length;

  const staticAccountKeys = [
    ...writableSigners.map(([address]) => address),
    ...readonlySigners.map(([address]) => address),
    ...writableNonSigners.map(([address]) => address),
    ...readonlyNonSigners.map(([address]) => address),
  ];

  const addressesToIndexes = new Map<Pubkey, number>();
  for (let index = 0; index < staticAccountKeys.length; index++) {
    addressesToIndexes.set(staticAccountKeys[index]!, index);
  }

  const data = new Array<Uint8Array>();
  const header = new Uint8Array(5);
  header[0] = 0x80;
  header[1] = numRequiredSignatures;
  header[2] = numReadonlySignedAccounts;
  header[3] = numReadonlyUnsignedAccounts;
  header[4] = staticAccountKeys.length;
  data.push(header);
  for (const staticAccountKey of staticAccountKeys) {
    data.push(base58Decode(staticAccountKey));
  }
  data.push(base58Decode(recentBlockhash));

  data.push(new Uint8Array([instructions.length]));
  for (const instruction of instructions) {
    data.push(
      new Uint8Array([
        addressesToIndexes.get(instruction.programAddress)!,
        instruction.inputs.length,
      ]),
    );
    for (const input of instruction.inputs) {
      data.push(new Uint8Array([addressesToIndexes.get(input.address)!]));
    }
    data.push(new Uint8Array([instruction.data.length]));
    data.push(instruction.data);
  }

  data.push(new Uint8Array([0])); // LUTs count

  return flatten(data);
}

it("run", async () => {
  const payer = new Keypair();
  const signer = new Keypair();

  const blockhash = generateBlockhash();
  const generatedInstruction1 = generateInstruction();
  const generatedInstruction2 = generateInstruction();

  const referenceMessage = new TransactionMessage({
    payerKey: payer.publicKey,
    recentBlockhash: blockhash,
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
    blockhash,
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
  const dudu = await rpcHttpGetTransactionExecution(rpcHttp, "!");
  console.log("dudu", JSON.stringify(dudu, null, 2));
});

/* function generateAddressLookupTables() {} */

function generateBlockhash() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base58Encode(bytes);
}

function generateInstruction() {
  const programAddress = pubkeyNewRandom();
  const signerWritableAddress = pubkeyNewRandom();
  const signerReadonlyAddress = pubkeyNewRandom();
  const writableAddress = pubkeyNewRandom();
  const readonlyAddress = pubkeyNewRandom();
  const data = new Uint8Array(10);
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
