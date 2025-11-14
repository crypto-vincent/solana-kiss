import { it } from "@jest/globals";
import { ErrorStackable } from "../src";

it("run", async () => {
  const errorOuter1 = new ErrorStackable("Outer error\n- 2nd Line", [
    "Hello World",
    new Error("Inner error 1\n- Line 2\n- Line 3"),
  ]);
  const errorOuter2 = new ErrorStackable("Another outer error", [
    new ErrorStackable(
      "Stackable inner",
      new ErrorStackable(
        "Single line inner1",
        new ErrorStackable("Single line inner2", 42),
      ),
    ),
    42,
  ]);
  const errorTop = new ErrorStackable("Top error\nWith Multiline", [
    errorOuter1,
    errorOuter2,
  ]);
  const expectedLines = [
    "Error: Top error",
    "With Multiline",
    "├── Error: Outer error",
    "│   - 2nd Line",
    "│   ├── Hello World",
    "│   └── Error: Inner error 1",
    "│       - Line 2",
    "│       - Line 3",
    "└── Error: Another outer error",
    "    ├── Error: Stackable inner",
    "    │   └── Error: Single line inner1",
    "    │       └── Error: Single line inner2",
    "    │           └── 42",
    "    └── 42",
  ];
  const foundLines = String(errorTop).split("\n");
  expect(foundLines).toStrictEqual(expectedLines);
});
