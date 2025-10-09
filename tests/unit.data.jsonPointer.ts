import { expect, it } from "@jest/globals";
import { jsonPointerParse, jsonPointerPreview } from "../src";

it("run", async () => {
  const tests = [
    {
      path: "",
      pointer: [],
      preview: "",
    },
    {
      path: "hello",
      pointer: ["hello"],
      preview: "hello",
    },
    {
      path: "hello.world",
      pointer: ["hello", "world"],
      preview: "hello.world",
    },
    {
      path: "hello..world",
      pointer: ["hello", "", "world"],
      preview: "hello[].world",
    },
    {
      path: ".hello",
      pointer: ["hello"],
      preview: "hello",
    },
    {
      path: "/hello",
      pointer: ["hello"],
      preview: "hello",
    },
    {
      path: "[].world",
      pointer: ["", "world"],
      preview: "[].world",
    },
    {
      path: "[1].world",
      pointer: [1, "world"],
      preview: "[1].world",
    },
    {
      path: "..world",
      pointer: ["", "world"],
      preview: "[].world",
    },
    {
      path: "[].world",
      pointer: ["", "world"],
      preview: "[].world",
    },
    {
      path: "hello.",
      pointer: ["hello", ""],
      preview: "hello[]",
    },
    {
      path: "hello[]",
      pointer: ["hello", ""],
      preview: "hello[]",
    },
    {
      path: "hello[0].world",
      pointer: ["hello", 0, "world"],
      preview: "hello[0].world",
    },
    {
      path: "hello[].world",
      pointer: ["hello", "", "world"],
      preview: "hello[].world",
    },
    {
      path: "hello.[1].world",
      pointer: ["hello", "", 1, "world"],
      preview: "hello[][1].world",
    },
    {
      path: "hello[-1].world",
      pointer: ["hello", -1, "world"],
      preview: "hello[-1].world",
    },
    {
      path: "hello.-1.world",
      pointer: ["hello", -1, "world"],
      preview: "hello[-1].world",
    },
    {
      path: "hello/-1/world",
      pointer: ["hello", -1, "world"],
      preview: "hello[-1].world",
    },
    {
      path: "hello[0].key[][1][2].world",
      pointer: ["hello", 0, "key", "", 1, 2, "world"],
      preview: "hello[0].key[][1][2].world",
    },
    {
      path: "hello.0.key..1.2.world",
      pointer: ["hello", 0, "key", "", 1, 2, "world"],
      preview: "hello[0].key[][1][2].world",
    },
    {
      path: "hello/0/key//1/2/world",
      pointer: ["hello", 0, "key", "", 1, 2, "world"],
      preview: "hello[0].key[][1][2].world",
    },
  ];
  for (const test of tests) {
    expect(jsonPointerParse(test.path)).toStrictEqual(test.pointer);
    expect(jsonPointerPreview(test.pointer)).toStrictEqual(test.preview);
  }
});
