import { expect, it } from "@jest/globals";
import { idlAccountDecode, idlAccountEncode, idlProgramParse } from "../src";

it("run", () => {
  // Create an IDL on the fly
  const programIdl = idlProgramParse({
    accounts: {
      MyAccount1: {
        discriminator: [74, 73, 72, 71],
      },
      MyAccount2: {
        discriminator: [99],
        fields: [
          { name: "val1", type: "MyStruct" },
          { name: "val2", type: { defined: "MyStruct" } },
        ],
      },
    },
    types: {
      MyAccount1: {
        fields: [
          { name: "name", type: "string" },
          { name: "struct", type: "MyStruct" },
          { name: "never", variants: [] },
          { name: "array", type: ["u16", 3] },
          { name: "vec", type: ["i16"] },
        ],
      },
      MyStruct: {
        fields: [
          { name: "integer", type: "u32" },
          { name: "my_enum", type: { defined: "MyEnum" } },
          { name: "byte", type: "u8" },
        ],
      },
      MyEnum: {
        variants: ["Hello0", "Hello1", "Hello2"],
      },
    },
  });
  // MyAccount1 prepared
  const accountIdl1 = programIdl.accounts.get("MyAccount1")!;
  const accountstate1 = {
    name: "ABCD",
    struct: {
      integer: 42,
      my_enum: "Hello1",
      byte: 77,
    },
    never: null,
    array: [99, 98, 97],
    vec: [-55, 56, 57],
  };
  // Check that we can use the manual IDL to encode/decode our account 1
  const accountData1 = idlAccountEncode(accountIdl1, accountstate1);
  expect(accountData1).toStrictEqual(
    new Uint8Array([
      74, 73, 72, 71, 4, 0, 0, 0, 65, 66, 67, 68, 42, 0, 0, 0, 1, 77, 99, 0, 98,
      0, 97, 0, 3, 0, 0, 0, 201, 255, 56, 0, 57, 0,
    ]),
  );
  expect(accountstate1).toStrictEqual(
    idlAccountDecode(accountIdl1, accountData1),
  );
  // MyAccount2 prepared
  const accountIdl2 = programIdl.accounts.get("MyAccount2")!;
  const accountState2 = {
    val1: {
      integer: 43,
      my_enum: "Hello0",
      byte: 78,
    },
    val2: {
      integer: 44,
      my_enum: "Hello2",
      byte: 79,
    },
  };
  // Check that we can use the manual IDL to encode/decode our account 2
  const accountData2 = idlAccountEncode(accountIdl2, accountState2);
  expect(
    new Uint8Array([99, 43, 0, 0, 0, 0, 78, 44, 0, 0, 0, 2, 79]),
  ).toStrictEqual(accountData2);
  expect(accountState2).toStrictEqual(
    idlAccountDecode(accountIdl2, accountData2),
  );
});
