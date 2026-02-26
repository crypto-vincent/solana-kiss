import { expect, it } from "@jest/globals";
import { pubkeyFromBase58, Solana } from "../src";

it("run", async () => {
  const solana = new Solana("devnet");
  const programAddress1 = pubkeyFromBase58(
    "ProgM6JCCvbYkfKqJYHePx4xxSUSqJp7rh8Lyv7nk7S",
  );
  const { programIdl: programIdl1 } =
    await solana.getOrLoadProgramIdl(programAddress1);
  expect(programIdl1.metadata.address).toStrictEqual(programAddress1);
  expect(programIdl1.metadata.version).toStrictEqual("1.0.0");

  const programAddress2 = pubkeyFromBase58(
    "6hCEKFurgG2DFgKwAeTu1umfZecXSfoHj1nxZhRRcxvN",
  );
  const { programIdl: programIdl2 } =
    await solana.getOrLoadProgramIdl(programAddress2);
  expect(programIdl2.metadata.address).toStrictEqual(programAddress2);
  expect(programIdl2.metadata.version).toStrictEqual("0.1.1");
});
