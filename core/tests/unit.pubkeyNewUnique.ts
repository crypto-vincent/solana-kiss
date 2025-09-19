import { PublicKey } from "@solana/web3.js";
import { pubkeyNewDummy } from "../src";

it("run", async () => {
  for (let i = 0; i < 100; i++) {
    const found = pubkeyNewDummy();
    const expected = PublicKey.unique().toBase58();
    expect(found).toStrictEqual(expected);
  }
});
