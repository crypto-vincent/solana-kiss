import { expect, it } from "@jest/globals";
import {
  pubkeyFromBase58,
  rpcHttpFromUrl,
  Solana,
  urlRpcPublicDevnet,
} from "../src";

it("run", async () => {
  const solana = new Solana(rpcHttpFromUrl(urlRpcPublicDevnet));
  const programAddress = pubkeyFromBase58(
    "ProgM6JCCvbYkfKqJYHePx4xxSUSqJp7rh8Lyv7nk7S",
  );
  const { programIdl } = await solana.getOrLoadProgramIdl(programAddress);
  expect(programIdl.metadata.name).toStrictEqual("whirlpool"); // TODO - make this work
  expect(programIdl.metadata.address).toStrictEqual(programAddress);
  expect(programIdl.typedefs.size).toStrictEqual(12);
  expect(programIdl.accounts.size).toStrictEqual(8);
  expect(programIdl.instructions.size).toStrictEqual(46);
  expect(programIdl.errors.size).toStrictEqual(56);
  expect(programIdl.events.size).toStrictEqual(0);
});
