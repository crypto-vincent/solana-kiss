import { expect, it } from "@jest/globals";
import {
  expectDefined,
  idlPdaFind,
  idlProgramParse,
  pubkeyFindPdaAddress,
  pubkeyNewDummy,
  pubkeyToBase58,
} from "../src";

it("run", async () => {
  // Keys used during the test
  const dummyAddress = pubkeyNewDummy();
  // Create an IDL on the fly
  const programIdl1 = idlProgramParse({
    pdas: {
      MyPdaNoDefault: {
        docs: ["This is my PDA with docs."],
        seeds: [{ input: "my_input", type: ["u8"] }],
      },
      MyPdaDefaulted: {
        seeds: [{ input: "my_input", value: [1, 2, 3] }],
      },
      MyPdaProgramAddress: {
        seeds: [{ input: "my_input", type: ["u8"] }],
        program: { value: pubkeyToBase58(dummyAddress), type: "pubkey" },
      },
    },
  });
  const programIdl2 = idlProgramParse({
    pdas: [
      {
        name: "MyPdaNoDefault",
        docs: ["This is my PDA with docs."],
        seeds: [{ input: "my_input", type: ["u8"] }],
      },
      {
        name: "MyPdaDefaulted",
        seeds: [{ input: "my_input", value: [1, 2, 3] }],
      },
      {
        name: "MyPdaProgramAddress",
        seeds: [{ input: "my_input", type: ["u8"] }],
        program: { value: pubkeyToBase58(dummyAddress), type: "pubkey" },
      },
    ],
  });
  // Check all are identical
  expect(programIdl1).toStrictEqual(programIdl2);
  // Compute PDA address
  const pdaAddress = pubkeyFindPdaAddress(dummyAddress, [
    new Uint8Array([1, 2, 3]),
  ]);
  expect(pdaAddress).toStrictEqual(
    idlPdaFind(
      expectDefined(programIdl1.pdas.get("MyPdaNoDefault")),
      { my_input: [1, 2, 3] },
      dummyAddress,
    ),
  );
  expect(pdaAddress).toStrictEqual(
    idlPdaFind(
      expectDefined(programIdl1.pdas.get("MyPdaDefaulted")),
      {},
      dummyAddress,
    ),
  );
  expect(pdaAddress).toStrictEqual(
    idlPdaFind(expectDefined(programIdl1.pdas.get("MyPdaProgramAddress")), {
      my_input: [1, 2, 3],
    }),
  );
});
