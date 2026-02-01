import { it } from "@jest/globals";
import { idlProgramParse } from "../src";

it("run", async () => {
  // Parse IDL from file JSON directly
  const programIdl = idlProgramParse(require("./fixtures/codama_v1.json"));
  // TODO - make it work
  console.log(programIdl);
});
