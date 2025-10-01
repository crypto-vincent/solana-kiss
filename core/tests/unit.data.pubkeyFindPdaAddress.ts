import { PublicKey } from "@solana/web3.js";
import {
  base58Decode,
  pubkeyDefault,
  pubkeyFindPdaAddressAndBump,
  pubkeyNewDummy,
} from "../src";

it("run", async () => {
  const tests: Array<{
    programAddress: string;
    seeds: Array<Uint8Array>;
  }> = [
    {
      programAddress: pubkeyDefault(),
      seeds: [],
    },
    {
      programAddress: pubkeyDefault(),
      seeds: [new Uint8Array(), new Uint8Array(), new Uint8Array()],
    },
    {
      programAddress: pubkeyDefault(),
      seeds: [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5, 6])],
    },
    {
      programAddress: "BPFLoader1111111111111111111111111111111111",
      seeds: [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5, 6])],
    },
    {
      programAddress: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
      seeds: [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5, 6])],
    },
  ];
  for (let counter = 0; counter < 10; counter++) {
    tests.push({
      programAddress: pubkeyNewDummy(),
      seeds: [
        new Uint8Array([1, 2, 3]),
        new Uint8Array([4, 5, 6]),
        new Uint8Array([7, 8, 9]),
      ],
    });
  }
  for (let counter = 0; counter < 10; counter++) {
    tests.push({
      programAddress: pubkeyNewDummy(),
      seeds: [
        base58Decode(pubkeyNewDummy()),
        base58Decode(pubkeyNewDummy()),
        base58Decode(pubkeyNewDummy()),
      ],
    });
  }
  for (const test of tests) {
    const seeds = test.seeds.map((seed) => new Uint8Array(seed));
    const { address: foundAddress, bump: foundBump } =
      pubkeyFindPdaAddressAndBump(test.programAddress, seeds);
    const [expectedKey, expectedBump] = PublicKey.findProgramAddressSync(
      seeds,
      new PublicKey(test.programAddress),
    );
    expect(foundAddress).toStrictEqual(expectedKey.toBase58());
    expect(foundBump).toStrictEqual(expectedBump);
  }
});
