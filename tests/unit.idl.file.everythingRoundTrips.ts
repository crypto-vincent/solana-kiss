import { expect, it } from "@jest/globals";
import { idlProgramParse, JsonValue } from "../src";

it("run", async () => {
  checkRoundTrip(require("./fixtures/idl_anchor_26.json"));
  checkRoundTrip(require("./fixtures/idl_anchor_29.json"));
  checkRoundTrip(require("./fixtures/idl_anchor_30.json"));
  checkRoundTrip(require("./fixtures/idl_anchor_generics.json"));
  checkRoundTrip(require("./fixtures/idl_anchor_new.json"));
  checkRoundTrip(require("./fixtures/idl_anchor_old.json"));
  checkRoundTrip(require("./fixtures/idl_codama_1.json"));
});

function checkRoundTrip(originalJson: JsonValue) {
  const programIdl = idlProgramParse(originalJson);
  const copiedJson = programIdl.original.getJsonCopy();
  expect(copiedJson).toStrictEqual(originalJson);
  expect(programIdl).toStrictEqual(idlProgramParse(copiedJson));
}
