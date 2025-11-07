import { expect, it } from "@jest/globals";
import {
  expectDefined,
  idlAccountDecode,
  idlAccountEncode,
  idlProgramParse,
  jsonCodecNumber,
  jsonCodecObject,
  jsonCodecString,
} from "../src";

it("run", () => {
  // Create an IDL on the fly with various casings
  const programIdl = idlProgramParse({
    accounts: {
      MyAccount: {
        fields: [
          { name: "my_key1", type: "string" },
          { name: "myKey2", type: "string" },
          {
            name: "my_struct",
            fields: [
              { name: "innerKey1", type: "u32" },
              { name: "inner_key2", type: "string" },
            ],
          },
        ],
      },
    },
  });
  // Select our account
  const accountIdl = expectDefined(programIdl.accounts.get("MyAccount"));
  // Check that we can properly encode/decode snake case
  const stateSnake = {
    my_key1: "Value 1",
    my_key2: "Value 2",
    my_struct: {
      inner_key1: 123,
      inner_key2: "Inner Value 2",
    },
  };
  const encodedSnake = idlAccountEncode(accountIdl, stateSnake);
  expect(idlAccountDecode(accountIdl, encodedSnake)).toStrictEqual(stateSnake);
  // Check that we can properly encode/decode camel case
  const stateCamel = {
    myKey1: "Value 1",
    myKey2: "Value 2",
    myStruct: {
      innerKey1: 123,
      innerKey2: "Inner Value 2",
    },
  };
  const encodedCamel = idlAccountEncode(accountIdl, stateCamel);
  expect(idlAccountDecode(accountIdl, encodedCamel)).toStrictEqual(stateSnake);
  // Check that both encodings produce the same bytes
  expect(encodedCamel).toStrictEqual(encodedSnake);
  // Check that we can properly combine it with the json codec system
  expect(
    jsonCodec.decoder(idlAccountDecode(accountIdl, encodedSnake)),
  ).toStrictEqual(stateCamel);
  expect(
    idlAccountEncode(accountIdl, jsonCodec.encoder(stateCamel)),
  ).toStrictEqual(encodedSnake);
});

const jsonCodec = jsonCodecObject({
  myKey1: jsonCodecString,
  myKey2: jsonCodecString,
  myStruct: jsonCodecObject({
    innerKey1: jsonCodecNumber,
    innerKey2: jsonCodecString,
  }),
});
