import { it } from "@jest/globals";
import { ErrorStackable } from "../src";

it("run", async () => {
  const errorOuter1 = new ErrorStackable("Outer error\n- 2nd Line", [
    "Hello World",
    new Error("Inner error 1\n- Line 2\n- Line 3"),
  ]);
  const errorOuter2 = new ErrorStackable("Another outer error", [
    new ErrorStackable("Stackable inner"),
    42,
  ]);
  const errorTop = new ErrorStackable("Top error\n- Dudu", [
    errorOuter1,
    errorOuter2,
  ]);
  const expectedLines = [
    "Error: Top error",
    "- Dudu",
    "",
    "+-- Cause 1:",
    "| Error: Outer error",
    "| - 2nd Line",
    "| ",
    "| +-- Cause 1:",
    "| | Hello World",
    "| +---",
    "| ",
    "| +-- Cause 2:",
    "| | Error: Inner error 1",
    "| | - Line 2",
    "| | - Line 3",
    "| +---",
    "+---",
    "",
    "+-- Cause 2:",
    "| Error: Another outer error",
    "| ",
    "| +-- Cause 1:",
    "| | Error: Stackable inner",
    "| +---",
    "| ",
    "| +-- Cause 2:",
    "| | 42",
    "| +---",
    "+---",
  ];
  const foundLines = String(errorTop).split("\n");
  expect(foundLines).toStrictEqual(expectedLines);
});
