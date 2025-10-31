import { it } from "@jest/globals";
import {
  blockHashDefault,
  Pubkey,
  pubkeyNewDummy,
  signerGenerate,
  transactionCompileAndSign,
  transactionDecompileRequest,
  transactionExtractMessage,
} from "../src";

it("run", async () => {
  const payerSigner = await signerGenerate();
  const dummyAddresses = new Array<Pubkey>();
  for (let count = 0; count < 200; count++) {
    dummyAddresses.push(pubkeyNewDummy());
  }
  const addressLookupTable1 = pubkeyNewDummy();
  const addressLookupTable2 = pubkeyNewDummy();
  const addressLookupTables = new Map<Pubkey, Array<Pubkey>>();
  addressLookupTables.set(
    addressLookupTable1,
    dummyAddresses.filter((_, i) => i % 2 === 0),
  );
  addressLookupTables.set(
    addressLookupTable2,
    dummyAddresses.filter((_, i) => i % 2 === 1),
  );
  const instructions = [
    {
      programAddress: pubkeyNewDummy(),
      inputs: dummyAddresses.map((address, index) => ({
        address,
        signer: false,
        writable: index % 3 === 0,
      })),
      data: new Uint8Array([]),
    },
  ];
  const transactionRequest = {
    payerAddress: payerSigner.address,
    recentBlockHash: blockHashDefault,
    instructions,
  };
  const transactionPacket = await transactionCompileAndSign(
    [payerSigner],
    transactionRequest,
    addressLookupTables,
  );
  const transactionMessage = transactionExtractMessage(transactionPacket);
  expect(
    transactionDecompileRequest(transactionMessage, addressLookupTables),
  ).toStrictEqual(transactionRequest);
});
