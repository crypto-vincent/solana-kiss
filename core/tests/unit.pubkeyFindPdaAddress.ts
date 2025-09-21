import { PublicKey } from "@solana/web3.js";
import {
  base58Decode,
  pubkeyFindPdaAddressAndBump,
  pubkeyNewRandom,
} from "../src";

it("run", async () => {
  const tests: Array<{
    programId: string;
    seeds: Array<Uint8Array>;
  }> = [
    {
      programId: "11111111111111111111111111111111",
      seeds: [],
    },
    {
      programId: "11111111111111111111111111111111",
      seeds: [new Uint8Array(), new Uint8Array(), new Uint8Array()],
    },
    {
      programId: "11111111111111111111111111111111",
      seeds: [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5, 6])],
    },
    {
      programId: "BPFLoader1111111111111111111111111111111111",
      seeds: [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5, 6])],
    },
    {
      programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
      seeds: [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5, 6])],
    },
  ];
  for (let i = 0; i < 100; i++) {
    tests.push({
      programId: pubkeyNewRandom(),
      seeds: [
        new Uint8Array([1, 2, 3]),
        new Uint8Array([4, 5, 6]),
        new Uint8Array([7, 8, 9]),
      ],
    });
  }
  for (let i = 0; i < 100; i++) {
    tests.push({
      programId: pubkeyNewRandom(),
      seeds: [
        base58Decode(pubkeyNewRandom()),
        base58Decode(pubkeyNewRandom()),
        base58Decode(pubkeyNewRandom()),
      ],
    });
  }
  for (const test of tests) {
    const seeds = test.seeds.map((seed) => new Uint8Array(seed));
    const { address: foundAddress, bump: foundBump } =
      pubkeyFindPdaAddressAndBump(test.programId, seeds);
    const [expectedKey, expectedBump] = PublicKey.findProgramAddressSync(
      seeds,
      new PublicKey(test.programId),
    );
    expect(foundAddress).toStrictEqual(expectedKey.toBase58());
    expect(foundBump).toStrictEqual(expectedBump);
  }
});
