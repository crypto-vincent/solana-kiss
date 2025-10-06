import { expect, it } from "@jest/globals";
import { casingKeyedCamelToSnake, casingKeyedSnakeToCamel } from "../src";

it("run", async () => {
  const objectCamel = {
    helloWorld: 123,
    fooBar4242: "yes",
  };
  const objectSnake = {
    hello_world: 123,
    foo_bar4242: "yes",
  };
  const objectCamelComputed = casingKeyedSnakeToCamel(objectSnake);
  const objectSnakeComputed = casingKeyedCamelToSnake(objectCamel);
  expect(objectCamelComputed).toStrictEqual(objectCamel);
  expect(objectSnakeComputed).toStrictEqual(objectSnake);
});
