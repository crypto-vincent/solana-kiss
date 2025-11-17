import { it } from "@jest/globals";
import {
  Keypair,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  blockHashDefault,
  InstructionRequest,
  Pubkey,
  pubkeyDefault,
  pubkeyNewDummy,
  signerFromSecret,
  TransactionAddressLookupTable,
  transactionCompileAndSign,
  transactionDecompileRequest,
  transactionExtractMessage,
  TransactionRequest,
} from "../src";

it("run", async () => {
  const payerSigner = await signerFromSecret(payerSecret);
  const programAddress = pubkeyDefault;
  const dummyAddresses = new Array<Pubkey>();
  for (let count = 0; count < 200; count++) {
    dummyAddresses.push(pubkeyNewDummy());
  }
  const transactionAddressLookupTables =
    new Array<TransactionAddressLookupTable>();
  transactionAddressLookupTables.push({
    tableAddress: pubkeyNewDummy(),
    lookupAddresses: dummyAddresses.filter((_, i) => i % 2 === 1),
  });
  transactionAddressLookupTables.push({
    tableAddress: pubkeyNewDummy(),
    lookupAddresses: [programAddress, pubkeyNewDummy()],
  });
  transactionAddressLookupTables.push({
    tableAddress: pubkeyNewDummy(),
    lookupAddresses: dummyAddresses.filter((_, i) => i % 2 === 0),
  });
  const instructionsRequests: Array<InstructionRequest> = [
    {
      programAddress,
      instructionInputs: dummyAddresses.map((address, index) => ({
        address,
        signer: false,
        writable: index % 3 === 0,
      })),
      instructionData: new Uint8Array([42, 42, 42]),
    },
  ];
  const transactionRequest: TransactionRequest = {
    payerAddress: payerSigner.address,
    recentBlockHash: blockHashDefault,
    instructionsRequests,
  };
  const currentPacket = await transactionCompileAndSign(
    [payerSigner],
    transactionRequest,
    transactionAddressLookupTables,
  );
  const currentMessage = transactionExtractMessage(currentPacket);
  expect(
    transactionDecompileRequest(currentMessage, transactionAddressLookupTables),
  ).toStrictEqual(transactionRequest);

  const referenceMessage = new TransactionMessage({
    payerKey: new PublicKey(payerSigner.address),
    recentBlockhash: transactionRequest.recentBlockHash as string,
    instructions: instructionsRequests.map((instructionRequest) => ({
      programId: new PublicKey(instructionRequest.programAddress),
      keys: instructionRequest.instructionInputs.map((instructionInput) => ({
        pubkey: new PublicKey(instructionInput.address),
        isSigner: instructionInput.signer,
        isWritable: instructionInput.writable,
      })),
      data: Buffer.from(instructionRequest.instructionData),
    })),
  }).compileToV0Message(
    transactionAddressLookupTables.map((alt) => ({
      key: new PublicKey(alt.tableAddress),
      state: {
        addresses: alt.lookupAddresses.map((address) => new PublicKey(address)),
      } as any,
      isActive: () => true,
    })),
  );
  const referencePacket = new VersionedTransaction(referenceMessage);
  referencePacket.sign([Keypair.fromSecretKey(payerSecret)]);
  expect(currentPacket).toStrictEqual(referencePacket.serialize());
  expect(currentMessage).toStrictEqual(referenceMessage.serialize());
});

const payerSecret = new Uint8Array([
  253, 106, 204, 143, 156, 225, 66, 188, 227, 208, 143, 26, 144, 47, 245, 32,
  217, 222, 212, 216, 243, 147, 179, 91, 179, 79, 3, 159, 237, 186, 36, 177, 62,
  57, 237, 150, 98, 58, 101, 43, 0, 142, 99, 249, 116, 205, 144, 75, 39, 143,
  146, 102, 197, 80, 18, 218, 155, 250, 102, 206, 200, 229, 228, 173,
]);
