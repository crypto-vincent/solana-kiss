import { jsonGetAt, pubkeyFromBase58, Solana } from "../src";

it("run", async () => {
  const solana = new Solana("mainnet");

  const { accountState } = await solana.getAndInferAndDecodeAccount(
    pubkeyFromBase58("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
  );

  expect(jsonGetAt(accountState, "is_initialized")).toStrictEqual(true);
  expect(jsonGetAt(accountState, "decimals")).toStrictEqual(6);
  expect(jsonGetAt(accountState, "mint_authority")).toStrictEqual(
    "BJE5MMbqXjVwjAF7oxwPYXnTXDyspzZyt4vwenNw5ruG",
  );
});
