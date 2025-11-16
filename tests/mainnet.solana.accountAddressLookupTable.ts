import {
  jsonCodecArray,
  jsonCodecBoolean,
  jsonCodecInteger,
  jsonCodecNumber,
  jsonCodecObject,
  jsonCodecPubkey,
  pubkeyDefault,
  pubkeyFromBase58,
  rpcHttpFromUrl,
  Solana,
  urlRpcPublicMainnet,
} from "../src";

it("run", async () => {
  const solana = new Solana(rpcHttpFromUrl(urlRpcPublicMainnet));
  const { programIdl, accountState } = await solana.getAndInferAndDecodeAccount(
    pubkeyFromBase58("45AMNJMGuojexK1rEBHJSSVFDpTUcoHRcAUmRfLF8hrm"),
  );
  expect(programIdl.metadata.address).toBe(
    "AddressLookupTab1e1111111111111111111111111",
  );
  const addressLookupTable = jsonCodec.decoder(accountState);
  expect(addressLookupTable.deactivationSlot).toBe(0xffffffffffffffffn);
  expect(addressLookupTable.lastExtendedSlot).toBe(320650144n);
  expect(addressLookupTable.lastExtendedIndex).toBe(56);
  expect(addressLookupTable.editable).toBe(false);
  expect(addressLookupTable.authority).toBe(pubkeyDefault);
  expect(addressLookupTable.addresses.length).toBe(71);
  expect(addressLookupTable.addresses[0]).toBe(
    pubkeyFromBase58("3zK38YBP6u3BpLUpaa6QhRHh4VXdv3J8cmD24fFpuyqy"),
  );
  expect(addressLookupTable.addresses[10]).toBe(
    pubkeyFromBase58("JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB"),
  );
});

const jsonCodec = jsonCodecObject({
  deactivationSlot: jsonCodecInteger,
  lastExtendedSlot: jsonCodecInteger,
  lastExtendedIndex: jsonCodecNumber,
  editable: jsonCodecBoolean,
  authority: jsonCodecPubkey,
  padding: jsonCodecNumber,
  addresses: jsonCodecArray(jsonCodecPubkey),
});
