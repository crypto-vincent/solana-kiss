import { it } from "@jest/globals";
import { idlProgramParse } from "../src";

it("run", async () => {
  // Parse IDL from file JSON directly
  const programIdl = idlProgramParse(require("./fixtures/idl_codama_1.json"));
  // TODO - make it work (codama)
  console.log(programIdl);
  expect(programIdl.metadata.version).toStrictEqual("1.0.0");
});
