import { expect, it } from "@jest/globals";
import {
  expectDefined,
  idlInstructionAddressesHydrate,
  idlProgramParse,
  pubkeyFindPdaAddress,
  pubkeyNewDummy,
  pubkeyToBytes,
} from "../src";

it("run", async () => {
  // Create an IDL on the fly
  const programIdl = idlProgramParse({
    instructions: {
      my_ix: {
        discriminator: [77, 78],
        accounts: [
          { name: "account_snake" },
          { name: "accountCamel" },
          {
            name: "pda",
            pda: {
              seeds: [
                { kind: "arg", path: "arg_snake" },
                { kind: "arg", path: "argCamel" },
                { kind: "account", path: "account_snake.field_snake" },
                { kind: "account", path: "accountCamel.fieldCamel" },
                { kind: "account", path: "account_snake" },
                { kind: "account", path: "accountCamel" },
                { kind: "arg", path: "argSnake" },
                { kind: "arg", path: "arg_camel" },
                { kind: "account", path: "accountSnake.fieldSnake" },
                { kind: "account", path: "account_camel.field_camel" },
                { kind: "account", path: "accountSnake" },
                { kind: "account", path: "account_camel" },
              ],
            },
          },
        ],
        args: [
          { name: "arg_snake", type: "u8" },
          { name: "argCamel", type: "u16" },
        ],
      },
    },
    accounts: {
      MyAccount: {
        fields: [
          { name: "field_snake", type: "u32" },
          { name: "fieldCamel", type: "u64" },
        ],
      },
    },
  });
  // Keys used during the test
  const accountSnakeAddress = pubkeyNewDummy();
  const accountCamelAddress = pubkeyNewDummy();
  const programAddress = pubkeyNewDummy();
  const pdaSeeds = [
    new Uint8Array([42]),
    new Uint8Array([43, 0]),
    new Uint8Array([44, 0, 0, 0]),
    new Uint8Array([45, 0, 0, 0, 0, 0, 0, 0]),
    pubkeyToBytes(accountSnakeAddress),
    pubkeyToBytes(accountCamelAddress),
    new Uint8Array([42]),
    new Uint8Array([43, 0]),
    new Uint8Array([44, 0, 0, 0]),
    new Uint8Array([45, 0, 0, 0, 0, 0, 0, 0]),
    pubkeyToBytes(accountSnakeAddress),
    pubkeyToBytes(accountCamelAddress),
  ];
  const pdaAddress = pubkeyFindPdaAddress(programAddress, pdaSeeds);
  const myAccountType = programIdl.accounts.get("MyAccount")?.typeFull;
  // Assert that the accounts can be properly resolved in snake case
  const { instructionAddresses: instructionSnakeAddresses } =
    await idlInstructionAddressesHydrate(
      expectDefined(programIdl.instructions.get("my_ix")),
      programAddress,
      {
        addresses: {
          account_snake: accountSnakeAddress,
          account_camel: accountCamelAddress,
        },
        payload: {
          arg_snake: 42,
          arg_camel: 43,
        },
      },
      {
        accountsContext: {
          account_snake: {
            accountState: { field_snake: 44 },
            accountTypeFull: myAccountType,
          },
          account_camel: {
            accountState: { field_camel: 45 },
            accountTypeFull: myAccountType,
          },
        },
      },
    );
  expect(instructionSnakeAddresses["pda"]).toStrictEqual(pdaAddress);
  // Assert that the accounts can be properly resolved in camel case
  const { instructionAddresses: instructionCamelAddresses } =
    await idlInstructionAddressesHydrate(
      expectDefined(programIdl.instructions.get("my_ix")),
      programAddress,
      {
        addresses: {
          accountSnake: accountSnakeAddress,
          accountCamel: accountCamelAddress,
        },
        payload: {
          argSnake: 42,
          argCamel: 43,
        },
      },
      {
        accountsContext: {
          accountSnake: {
            accountState: { fieldSnake: 44 },
            accountTypeFull: myAccountType,
          },
          accountCamel: {
            accountState: { fieldCamel: 45 },
            accountTypeFull: myAccountType,
          },
        },
      },
    );
  expect(instructionCamelAddresses["pda"]).toStrictEqual(pdaAddress);
});
