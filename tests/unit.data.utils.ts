import { expect, it } from "@jest/globals";
import {
  bytesCompare,
  mapGuessIntendedKey,
  objectGuessIntendedKey,
} from "../src";

it("run", async () => {
  // mapGuessIntendedKey tests
  expect(testMap(["fooBar", "foo_bar"], "fooBar")).toStrictEqual("fooBar");
  expect(testMap(["fooBar", "foo_bar"], "foo_bar")).toStrictEqual("foo_bar");
  expect(testMap(["fooBar", "foo_bar"], "hello")).toStrictEqual("hello");
  expect(testMap(["foo_bar"], "fooBar")).toStrictEqual("foo_bar");
  expect(testMap(["fooBar"], "foo_bar")).toStrictEqual("fooBar");
  expect(testMap([], "hello")).toStrictEqual("hello");

  // objectGuessIntendedKey tests
  expect(testObj(["fooBar", "foo_bar"], "fooBar")).toStrictEqual("fooBar");
  expect(testObj(["fooBar", "foo_bar"], "foo_bar")).toStrictEqual("foo_bar");
  expect(testObj(["fooBar", "foo_bar"], "hello")).toStrictEqual("hello");
  expect(testObj(["foo_bar"], "fooBar")).toStrictEqual("foo_bar");
  expect(testObj(["fooBar"], "foo_bar")).toStrictEqual("fooBar");
  expect(testObj([], "hello")).toStrictEqual("hello");
  expect(testObj([], 42)).toStrictEqual("42");

  // bytesCompare tests
  expect(testBytesCompare([1, 2, 3], [1, 2, 3])).toStrictEqual(0);
  expect(testBytesCompare([1, 2], [1, 2, 3])).toStrictEqual(-1);
  expect(testBytesCompare([1, 2, 3], [1, 2])).toStrictEqual(1);
  expect(testBytesCompare([1, 2, 3], [1, 2, 4])).toStrictEqual(-1);
  expect(testBytesCompare([1, 2, 4], [1, 2, 3])).toStrictEqual(1);
});

function testObj(keys: Array<string>, key: string | number): string {
  const obj = Object.fromEntries(keys.map((key, index) => [key, index]));
  return objectGuessIntendedKey(obj, key);
}

function testMap(keys: Array<string>, key: string): string {
  const map = new Map(keys.map((key, index) => [key, index]));
  return mapGuessIntendedKey(map, key);
}

function testBytesCompare(a: Array<number>, b: Array<number>): number {
  return bytesCompare(new Uint8Array(a), new Uint8Array(b));
}
