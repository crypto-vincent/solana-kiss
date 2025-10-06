import { expect, it } from "@jest/globals";
import { PublicKey } from "@solana/web3.js";
import { Pubkey, pubkeyCreateFromSeed, pubkeyNewDummy } from "../src";

it("run", async () => {
  const tests = Array<{
    signerAddress: Pubkey;
    seedUtf8: string;
    ownerAddress: Pubkey;
  }>();
  for (let counter = 0; counter < 20; counter++) {
    tests.push({
      signerAddress: pubkeyNewDummy(),
      seedUtf8: `seed:${counter}`,
      ownerAddress: pubkeyNewDummy(),
    });
  }
  for (const test of tests) {
    const found = pubkeyCreateFromSeed(
      test.signerAddress,
      test.seedUtf8,
      test.ownerAddress,
    );
    const expected = (
      await PublicKey.createWithSeed(
        new PublicKey(test.signerAddress),
        test.seedUtf8,
        new PublicKey(test.ownerAddress),
      )
    ).toBase58();
    expect(found).toStrictEqual(expected);
  }
});
