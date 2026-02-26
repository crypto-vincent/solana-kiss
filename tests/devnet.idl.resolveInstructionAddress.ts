import { expect, it } from "@jest/globals";
import { pubkeyFromBase58, Solana } from "../src";

it("run", async () => {
  const solana = new Solana("devnet");

  const airdropAddress = await solana.resolveInstructionAddress(
    pubkeyFromBase58("9wQm7qfRmfPzY41Gb6uYGTpBnpbC1Sq45fV4Sf2zLsux"),
    "airdrop_create",
    "airdrop",
    { instructionPayload: { params: { id: 1 } } },
  );
  expect(airdropAddress).toStrictEqual(
    pubkeyFromBase58("EGtx5c3gGt5tQfWULsdPtgdquE7g43qAkhqNywRmms3z"),
  );

  const airdropCollateralAddress = await solana.resolveInstructionAddress(
    pubkeyFromBase58("9wQm7qfRmfPzY41Gb6uYGTpBnpbC1Sq45fV4Sf2zLsux"),
    "airdrop_create",
    "airdrop_collateral",
    {
      instructionAddresses: {
        collateralMint: pubkeyFromBase58(
          "76wX8tHAzuqucfwNfgzxugumab6cwPL5ZGdHWi8vhL8s",
        ),
      },
      instructionPayload: {
        params: { id: 1 },
      },
    },
  );
  expect(airdropCollateralAddress).toStrictEqual(
    pubkeyFromBase58("5rEr1kwdhbS9oGoeDkbHqbH5XpKajYhXAL1dHAyuvPtG"),
  );
});
