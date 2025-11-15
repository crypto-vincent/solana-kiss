import { expect, it } from "@jest/globals";
import {
  expectDefined,
  idlEventDecode,
  idlEventEncode,
  idlProgramParse,
} from "../src";

it("run", () => {
  // Create an IDL on the fly
  const programIdl = idlProgramParse({
    events: {
      MyEvent: {
        discriminator: [77, 78],
        fields: [
          { name: "v1", type: "u16" },
          { name: "v2", type: ["u8"] },
        ],
      },
    },
  });
  // Choose the event
  const eventIdl = expectDefined(programIdl.events.get("MyEvent"));
  // Check instruction return data encoding/decoding
  const eventPayload = {
    v1: 100,
    v2: [2, 0, 42],
  };
  const { eventData } = idlEventEncode(eventIdl, eventPayload);
  expect(eventData).toStrictEqual(
    new Uint8Array([77, 78, 100, 0, 3, 0, 0, 0, 2, 0, 42]),
  );
  expect(idlEventDecode(eventIdl, eventData).eventPayload).toStrictEqual(
    eventPayload,
  );
});
