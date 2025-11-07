import { expect, it } from "@jest/globals";
import {
  expectDefined,
  idlInstructionAccountsDecode,
  idlInstructionAccountsEncode,
  idlInstructionArgsDecode,
  idlInstructionArgsEncode,
  idlProgramParse,
  pubkeyNewDummy,
} from "../src";

it("run", () => {
  // Create an IDL on the fly
  const programIdl = idlProgramParse({
    instructions: {
      my_ix: {
        discriminator: [77, 78],
        accounts: [
          { name: "my_account1", signer: true },
          { name: "myAccount2", writable: true },
        ],
        args: [
          { name: "myArg1", type: "f32" },
          { name: "my_arg2", type: "string" },
        ],
      },
    },
  });
  // Choose the instruction
  const instructionIdl = expectDefined(programIdl.instructions.get("my_ix"));
  // Generate some addresses
  const account1Address = pubkeyNewDummy();
  const account2Address = pubkeyNewDummy();
  // Check that both casing styles are supported interchangeably on encoding accounts
  const instructionSnakeAddresses = {
    my_account1: account1Address,
    my_account2: account2Address,
  };
  const instructionCamelAddresses = {
    myAccount1: account1Address,
    myAccount2: account2Address,
  };
  const instructionSnakeInputs = idlInstructionAccountsEncode(
    instructionIdl,
    instructionSnakeAddresses,
  );
  const instructionCamelInputs = idlInstructionAccountsEncode(
    instructionIdl,
    instructionCamelAddresses,
  );
  expect(instructionCamelInputs).toStrictEqual(instructionSnakeInputs);
  expect(
    idlInstructionAccountsDecode(instructionIdl, instructionSnakeInputs),
  ).toStrictEqual(instructionSnakeAddresses);
  // Check that both casing styles are supported interchangeably on encoding args
  const instructionSnakePayload = {
    my_arg1: 42,
    my_arg2: "hello world",
  };
  const instructionCamelPayload = {
    myArg1: 42,
    myArg2: "hello world",
  };
  const instructionSnakeData = idlInstructionArgsEncode(
    instructionIdl,
    instructionSnakePayload,
  );
  const instructionCamelData = idlInstructionArgsEncode(
    instructionIdl,
    instructionCamelPayload,
  );
  expect(instructionCamelData).toStrictEqual(instructionSnakeData);
  expect(
    idlInstructionArgsDecode(instructionIdl, instructionSnakeData),
  ).toStrictEqual(instructionSnakePayload);
});
