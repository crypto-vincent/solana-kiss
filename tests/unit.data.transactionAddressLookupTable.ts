import { it } from "@jest/globals";
import {
  Keypair,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  blockHashDefault,
  Pubkey,
  pubkeyDefault,
  pubkeyNewDummy,
  signerFromSecret,
  transactionCompileAndSign,
  transactionDecompileRequest,
  transactionExtractMessage,
} from "../src";
import { AddressLookupTable } from "../src/data/AddressLookupTable";

it("run", async () => {
  const payerSigner = await signerFromSecret(payerSecret);
  const programAddress = pubkeyDefault;
  const dummyAddresses = new Array<Pubkey>();
  for (let count = 0; count < 200; count++) {
    dummyAddresses.push(pubkeyNewDummy());
  }
  const addressLookupTables = new Array<AddressLookupTable>();
  addressLookupTables.push({
    tableAddress: pubkeyNewDummy(),
    lookupAddresses: dummyAddresses.filter((_, i) => i % 2 === 1),
  });
  addressLookupTables.push({
    tableAddress: pubkeyNewDummy(),
    lookupAddresses: [programAddress, pubkeyNewDummy()],
  });
  addressLookupTables.push({
    tableAddress: pubkeyNewDummy(),
    lookupAddresses: dummyAddresses.filter((_, i) => i % 2 === 0),
  });
  const instructions = [
    {
      programAddress,
      inputs: dummyAddresses.map((address, index) => ({
        address,
        signer: false,
        writable: index % 3 === 0,
      })),
      data: new Uint8Array([42, 42, 42]),
    },
  ];
  const transactionRequest = {
    payerAddress: payerSigner.address,
    recentBlockHash: blockHashDefault,
    instructions,
  };
  const currentPacket = await transactionCompileAndSign(
    [payerSigner],
    transactionRequest,
    addressLookupTables,
  );
  const currentMessage = transactionExtractMessage(currentPacket);
  expect(
    transactionDecompileRequest(currentMessage, addressLookupTables),
  ).toStrictEqual(transactionRequest);

  const referenceMessage = new TransactionMessage({
    payerKey: new PublicKey(payerSigner.address),
    recentBlockhash: transactionRequest.recentBlockHash as string,
    instructions: instructions.map((instruction) => ({
      programId: new PublicKey(instruction.programAddress),
      keys: instruction.inputs.map((instructionInput) => ({
        pubkey: new PublicKey(instructionInput.address),
        isSigner: instructionInput.signer,
        isWritable: instructionInput.writable,
      })),
      data: Buffer.from(instruction.data),
    })),
  }).compileToV0Message(
    addressLookupTables.map((alt) => ({
      key: new PublicKey(alt.tableAddress),
      state: {
        addresses: alt.lookupAddresses.map((address) => new PublicKey(address)),
      } as any,
      isActive: () => true,
    })),
  );
  console.log("currentMessage", (currentMessage as Uint8Array).slice(100));
  console.log("referenceMessage", referenceMessage.serialize().slice(100));
  const referencePacket = new VersionedTransaction(referenceMessage);
  referencePacket.sign([Keypair.fromSecretKey(payerSecret)]);
  console.log("referenceMessage", referenceMessage.compiledInstructions[0]);
  expect(currentPacket).toStrictEqual(referencePacket.serialize());
  expect(currentMessage).toStrictEqual(referenceMessage.serialize());
});

const payerSecret = new Uint8Array([
  253, 106, 204, 143, 156, 225, 66, 188, 227, 208, 143, 26, 144, 47, 245, 32,
  217, 222, 212, 216, 243, 147, 179, 91, 179, 79, 3, 159, 237, 186, 36, 177, 62,
  57, 237, 150, 98, 58, 101, 43, 0, 142, 99, 249, 116, 205, 144, 75, 39, 143,
  146, 102, 197, 80, 18, 218, 155, 250, 102, 206, 200, 229, 228, 173,
]);
