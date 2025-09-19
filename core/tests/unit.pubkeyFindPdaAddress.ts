import { PublicKey } from "@solana/web3.js";
import { base58Decode, pubkeyFindPdaAddress, pubkeyNewRandom } from "../src";

it("run", async () => {
  const tests = [
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
      seeds: [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5, 6])],
    });
  }
  for (let i = 0; i < 100; i++) {
    tests.push({
      programId: pubkeyNewRandom(),
      seeds: [
        new Uint8Array(base58Decode(pubkeyNewRandom())),
        new Uint8Array(base58Decode(pubkeyNewRandom())),
      ],
    });
  }
  for (const test of tests) {
    const seeds = test.seeds.map((seed) => new Uint8Array(seed));
    const pdaAddress = pubkeyFindPdaAddress(test.programId, seeds);
    const referenceAddress = PublicKey.findProgramAddressSync(
      seeds,
      new PublicKey(test.programId),
    )[0].toBase58();
    expect(pdaAddress).toStrictEqual(referenceAddress);
  }
});
