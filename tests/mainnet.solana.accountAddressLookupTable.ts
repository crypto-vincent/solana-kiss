import {
  jsonCodecArrayToArray,
  jsonCodecBigInt,
  jsonCodecBoolean,
  jsonCodecNumber,
  jsonCodecObjectToObject,
  jsonCodecPubkey,
  jsonGetAt,
  Pubkey,
  pubkeyDefault,
  pubkeyFromBase58,
  Solana,
} from "../src";

it("run", async () => {
  const solana = new Solana("mainnet");
  const { programIdl, accountState } = await solana.getAndInferAndDecodeAccount(
    pubkeyFromBase58("45AMNJMGuojexK1rEBHJSSVFDpTUcoHRcAUmRfLF8hrm"),
  );
  expect(programIdl.metadata.address).toBe(
    "AddressLookupTab1e1111111111111111111111111",
  );
  // Reading field-by-field via codec
  const addressLookupTable = jsonCodec.decoder(accountState);
  expect(addressLookupTable.deactivationSlot).toBe(0xffffffffffffffffn);
  expect(addressLookupTable.lastExtendedSlot).toBe(320650144n);
  expect(addressLookupTable.lastExtendedIndex).toBe(56);
  expect(addressLookupTable.editable).toBe(false);
  expect(addressLookupTable.authority).toBe(pubkeyDefault);
  expect(addressLookupTable.padding).toBe(0);
  expect(addressLookupTable.addresses.length).toBe(71);
  expect(addressLookupTable.addresses[0]).toBe(
    pubkeyFromBase58("3zK38YBP6u3BpLUpaa6QhRHh4VXdv3J8cmD24fFpuyqy"),
  );
  expect(addressLookupTable.addresses[10]).toBe(
    pubkeyFromBase58("JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB"),
  );
  // Reading addresses quick and dirty
  const lookupAddresses = jsonGetAt(accountState, "addresses") as Array<Pubkey>;
  expect(lookupAddresses.length).toBe(71);
  expect(lookupAddresses[0]).toBe(
    pubkeyFromBase58("3zK38YBP6u3BpLUpaa6QhRHh4VXdv3J8cmD24fFpuyqy"),
  );
  expect(lookupAddresses[10]).toBe(
    pubkeyFromBase58("JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB"),
  );
});

const jsonCodec = jsonCodecObjectToObject({
  deactivationSlot: jsonCodecBigInt,
  lastExtendedSlot: jsonCodecBigInt,
  lastExtendedIndex: jsonCodecNumber,
  editable: jsonCodecBoolean,
  authority: jsonCodecPubkey,
  padding: jsonCodecNumber,
  addresses: jsonCodecArrayToArray(jsonCodecPubkey),
});
