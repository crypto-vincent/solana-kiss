import { expect, it } from "@jest/globals";
import {
  expectDefined,
  idlInstructionAccountsDecode,
  idlInstructionAccountsEncode,
  idlProgramParse,
  pubkeyNewDummy,
} from "../src";

it("run", () => {
  // Create an IDL on the fly
  const programIdl = idlProgramParse({
    instructions: {
      my_ix: {
        accounts: [
          { name: "acc_0_0" },
          { name: "acc_1_1" },
          { name: "acc_2_1", optional: true },
          { name: "acc_3_1", optional: true },
          { name: "acc_4_2" },
          { name: "acc_5_3" },
          { name: "acc_6_3", optional: true },
          { name: "acc_7_3", optional: true },
        ],
      },
    },
  });
  // Choose the instruction
  const instructionIdl = expectDefined(programIdl.instructions.get("my_ix"));
  // Use dummy accounts
  const acc_0_0 = pubkeyNewDummy();
  const acc_1_1 = pubkeyNewDummy();
  const acc_2_1 = pubkeyNewDummy();
  const acc_3_1 = pubkeyNewDummy();
  const acc_4_2 = pubkeyNewDummy();
  const acc_5_3 = pubkeyNewDummy();
  const acc_6_3 = pubkeyNewDummy();
  const acc_7_3 = pubkeyNewDummy();
  // Check that we we can encode the instruction with none of the optional accounts
  const caseEmptyAddresses = {
    acc_0_0,
    acc_1_1,
    acc_4_2,
    acc_5_3,
  };
  const caseEmptyInputs = [
    { address: acc_0_0, signer: false, writable: false },
    { address: acc_1_1, signer: false, writable: false },
    { address: acc_4_2, signer: false, writable: false },
    { address: acc_5_3, signer: false, writable: false },
  ];
  expect(
    idlInstructionAccountsEncode(instructionIdl, caseEmptyAddresses),
  ).toStrictEqual(caseEmptyInputs);
  expect(
    idlInstructionAccountsDecode(instructionIdl, caseEmptyInputs),
  ).toStrictEqual(caseEmptyAddresses);
  // Check that we we can encode the instruction with all of the optional accounts
  const caseFullAddresses = {
    acc_0_0,
    acc_1_1,
    acc_2_1,
    acc_3_1,
    acc_4_2,
    acc_5_3,
    acc_6_3,
    acc_7_3,
  };
  const caseFullInputs = [
    { address: acc_0_0, signer: false, writable: false },
    { address: acc_1_1, signer: false, writable: false },
    { address: acc_2_1, signer: false, writable: false },
    { address: acc_3_1, signer: false, writable: false },
    { address: acc_4_2, signer: false, writable: false },
    { address: acc_5_3, signer: false, writable: false },
    { address: acc_6_3, signer: false, writable: false },
    { address: acc_7_3, signer: false, writable: false },
  ];
  expect(
    idlInstructionAccountsEncode(instructionIdl, caseFullAddresses),
  ).toStrictEqual(caseFullInputs);
  expect(
    idlInstructionAccountsDecode(instructionIdl, caseFullInputs),
  ).toStrictEqual(caseFullAddresses);
  // Check that we we can encode the instruction with all of the optional accounts
  const casePartial1Addresses = {
    acc_0_0,
    acc_1_1,
    acc_2_1,
    acc_4_2,
    acc_5_3,
  };
  const casePartial1Inputs = [
    { address: acc_0_0, signer: false, writable: false },
    { address: acc_1_1, signer: false, writable: false },
    { address: acc_2_1, signer: false, writable: false },
    { address: acc_4_2, signer: false, writable: false },
    { address: acc_5_3, signer: false, writable: false },
  ];
  expect(
    idlInstructionAccountsEncode(instructionIdl, casePartial1Addresses),
  ).toStrictEqual(casePartial1Inputs);
  expect(
    idlInstructionAccountsDecode(instructionIdl, casePartial1Inputs),
  ).toStrictEqual(casePartial1Addresses);
  // Check that we we can encode the instruction with all of the optional accounts
  const casePartial3Addresses = {
    acc_0_0,
    acc_1_1,
    acc_2_1,
    acc_3_1,
    acc_4_2,
    acc_5_3,
    acc_6_3,
  };
  const casePartial3Inputs = [
    { address: acc_0_0, signer: false, writable: false },
    { address: acc_1_1, signer: false, writable: false },
    { address: acc_2_1, signer: false, writable: false },
    { address: acc_3_1, signer: false, writable: false },
    { address: acc_4_2, signer: false, writable: false },
    { address: acc_5_3, signer: false, writable: false },
    { address: acc_6_3, signer: false, writable: false },
  ];
  expect(
    idlInstructionAccountsEncode(instructionIdl, casePartial3Addresses),
  ).toStrictEqual(casePartial3Inputs);
  expect(
    idlInstructionAccountsDecode(instructionIdl, casePartial3Inputs),
  ).toStrictEqual(casePartial3Addresses);
});
