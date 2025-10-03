import { expect, it } from "@jest/globals";
import { PublicKey } from "@solana/web3.js";
import { pubkeyCreateFromSeed, pubkeyNewDummy } from "../src";

it("run", async () => {
  const tests = Array<{
    programAddress: string;
    derivedAddress: string;
    seed: string;
  }>();
  for (let counter = 0; counter < 10; counter++) {
    tests.push({
      programAddress: pubkeyNewDummy(),
      derivedAddress: pubkeyNewDummy(),
      seed: `seed:${counter}`,
    });
  }
  for (const test of tests) {
    const found = pubkeyCreateFromSeed(
      test.programAddress,
      test.derivedAddress,
      test.seed,
    );
    const expected = (
      await PublicKey.createWithSeed(
        new PublicKey(test.derivedAddress),
        test.seed,
        new PublicKey(test.programAddress),
      )
    ).toBase58();
    expect(found).toStrictEqual(expected);
  }
});
