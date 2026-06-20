import { expect, it } from "@jest/globals";
import { expectDefined, idlProgramParse, IdlTypeFull } from "../src";

it("run", () => {
  // Parse IDLs from file JSON directly (both must succeed)
  const programOldIdl = idlProgramParse(
    require("./fixtures/idl_anchor_old.json"),
  );
  const programNewIdl = idlProgramParse(
    require("./fixtures/idl_anchor_new.json"),
  );
  // Should match the metadata
  expect(programNewIdl.metadata.name).toStrictEqual(
    programOldIdl.metadata.name,
  );
  expect(programNewIdl.metadata.version).toStrictEqual(
    programOldIdl.metadata.version,
  );
  expect(programNewIdl.metadata.docs).toStrictEqual(
    programOldIdl.metadata.docs,
  );
  // The OLD idl didnt provide "address" fields so we remove those for comparison
  for (const account of expectDefined(
    programNewIdl.instructions.get("initialize"),
  ).accounts) {
    expectDefined(account).address = undefined;
  }
  for (const account of expectDefined(
    programNewIdl.instructions.get("initialize_with_values"),
  ).accounts) {
    expectDefined(account).address = undefined;
  }
  for (const account of expectDefined(
    programNewIdl.instructions.get("initialize_with_values2"),
  ).accounts) {
    expectDefined(account).address = undefined;
  }
  // Expect proper instruction parsing that matches between old and new IDL
  expect(programNewIdl.instructions.get("initialize")).toStrictEqual(
    programOldIdl.instructions.get("initialize"),
  );
  expect(
    programNewIdl.instructions.get("initialize_with_values"),
  ).toStrictEqual(programOldIdl.instructions.get("initialize_with_values"));
  expect(
    programNewIdl.instructions.get("initialize_with_values2"),
  ).toStrictEqual(programOldIdl.instructions.get("initialize_with_values2"));
  // Expect the old and new IDL accounts to be identical type wise
  expect(programNewIdl.accounts.get("State")?.typeFull).toStrictEqual(
    IdlTypeFull.typedef({
      name: "State",
      repr: undefined,
      content: expectDefined(programOldIdl.accounts.get("State")).typeFull,
    }),
  );
  expect(programNewIdl.accounts.get("State2")?.typeFull).toStrictEqual(
    IdlTypeFull.typedef({
      name: "State2",
      repr: undefined,
      content: expectDefined(programOldIdl.accounts.get("State2")).typeFull,
    }),
  );
});
