import { idlProgramParse, IdlTypeFull } from "../src";

it("run", () => {
  // Parse IDLs from file JSON directly (both must succeed)
  const programOldIdl = idlProgramParse(
    require("./fixtures/idl_anchor_old.json"),
  );
  const programNewIdl = idlProgramParse(
    require("./fixtures/idl_anchor_new.json"),
  );
  // The OLD idl didnt provide "address" fields so we remove those for comparison
  programNewIdl.instructions.get(
    "initialize_with_values",
  )!.accounts[8]!.address = undefined;
  programNewIdl.instructions.get(
    "initialize_with_values2",
  )!.accounts[2]!.address = undefined;
  // Expect proper instruction parsing that matches between old and new IDL
  expect(
    programNewIdl.instructions.get("initialize_with_values")!,
  ).toStrictEqual(programOldIdl.instructions.get("initialize_with_values")!);
  expect(
    programNewIdl.instructions.get("initialize_with_values2")!,
  ).toStrictEqual(programOldIdl.instructions.get("initialize_with_values2")!);
  // Expect the old and new IDL accounts to be identical type wise
  expect(programNewIdl.accounts.get("State")!.contentTypeFull).toStrictEqual(
    IdlTypeFull.typedef({
      name: "State",
      repr: undefined,
      content: programOldIdl.accounts.get("State")!.contentTypeFull,
    }),
  );
  expect(programNewIdl.accounts.get("State2")!.contentTypeFull).toStrictEqual(
    IdlTypeFull.typedef({
      name: "State2",
      repr: undefined,
      content: programOldIdl.accounts.get("State2")!.contentTypeFull,
    }),
  );
});
