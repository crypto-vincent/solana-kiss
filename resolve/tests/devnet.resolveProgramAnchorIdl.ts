import { expect, it } from "@jest/globals";
import { rpcHttpFromUrl } from "solana-kiss-rpc";
import { resolveProgramAnchorIdl } from "../src";

it("run", async () => {
  const rpcHttp = rpcHttpFromUrl("https://api.devnet.solana.com");
  const programAnchorIdl = (await resolveProgramAnchorIdl(
    rpcHttp,
    "UCNcQRtrbGmvuLKA3Jv719Cc6DS4r661ZRpyZduxu2j",
  ))!;
  expect(programAnchorIdl.metadata.name).toStrictEqual("psyche_crowd_funding");
  expect(programAnchorIdl.typedefs.size).toBe(9);
  expect(programAnchorIdl.accounts.size).toBe(2);
  expect(programAnchorIdl.instructions.size).toBe(6);
  expect(programAnchorIdl.errors.size).toBe(5);
  expect(programAnchorIdl.events.size).toBe(0);
});
