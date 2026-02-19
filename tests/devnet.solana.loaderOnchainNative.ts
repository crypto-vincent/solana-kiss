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
  expect(programIdl.metadata.address).toStrictEqual(programAddress);
  expect(programIdl.metadata.version).toStrictEqual("1.0.0");
  expect(programIdl.metadata.source).toStrictEqual(
    `onchain://solana-program-metadata/canonical`,
  );
});
