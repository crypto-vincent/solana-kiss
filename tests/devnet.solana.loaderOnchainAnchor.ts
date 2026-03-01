import { expect, it } from "@jest/globals";
import { pubkeyFromBase58, Solana } from "../src";

it("run", async () => {
  const solana = new Solana("devnet");
  const programAddress = pubkeyFromBase58(
    "UCNcQRtrbGmvuLKA3Jv719Cc6DS4r661ZRpyZduxu2j",
  );
  const { programIdl } = await solana.getOrLoadProgramIdl(programAddress);
  expect(programIdl.metadata.name).toStrictEqual("psyche_crowd_funding");
  expect(programIdl.metadata.address).toStrictEqual(programAddress);
  expect(programIdl.typedefs.size).toStrictEqual(9);
  expect(programIdl.accounts.size).toStrictEqual(2);
  expect(programIdl.instructions.size).toStrictEqual(6);
  expect(programIdl.errors.size).toStrictEqual(5);
  expect(programIdl.events.size).toStrictEqual(0);
});
