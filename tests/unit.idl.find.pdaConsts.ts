import { expect, it } from "@jest/globals";
import {
  expectDefined,
  idlPdaFind,
  idlProgramParse,
  pubkeyFindPdaAddress,
  pubkeyNewDummy,
} from "../src";

it("run", async () => {
  // Keys used during the test
  const dummyAddress = pubkeyNewDummy();
  // Create an IDL on the fly
  const programIdl1 = idlProgramParse({
    pdas: { MyPda: { seeds: [{ value: "my_seed" }] } },
  });
  const programIdl2 = idlProgramParse({
    pdas: [{ name: "MyPda", seeds: [{ value: "my_seed" }] }],
  });
  const programIdl3 = idlProgramParse({
    pdas: [{ name: "MyPda", seeds: ["my_seed"] }],
  });
  const programIdl4 = idlProgramParse({
    pdas: { MyPda: { seeds: [[...Buffer.from("my_seed")]] } },
  });
  const programIdl5 = idlProgramParse({
    pdas: [{ name: "MyPda", seeds: [{ value: "my_seed", type: "string" }] }],
  });
  // Check all are identical
  expect(programIdl1).toStrictEqual(programIdl2);
  expect(programIdl1).toStrictEqual(programIdl3);
  expect(programIdl1).toStrictEqual(programIdl4);
  expect(programIdl1).toStrictEqual(programIdl5);
  // Compute PDA address
  const pdaAddress = pubkeyFindPdaAddress(dummyAddress, [
    new Uint8Array(Buffer.from("my_seed")),
  ]);
  expect(pdaAddress).toStrictEqual(
    idlPdaFind(expectDefined(programIdl1.pdas.get("MyPda")), {}, dummyAddress),
  );
});
