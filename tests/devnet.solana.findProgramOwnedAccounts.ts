import { it } from "@jest/globals";
import { jsonIsDeepSubset, pubkeyFromBase58, Solana } from "../src";

it("run", async () => {
  const solana = new Solana("devnet");
  const programAddress = pubkeyFromBase58(
    "UCNcQRtrbGmvuLKA3Jv719Cc6DS4r661ZRpyZduxu2j",
  );
  const ownedAccounts = await solana.findProgramOwnedAccounts(
    programAddress,
    "Campaign",
  );
  for (const ownedAccount of ownedAccounts.slice(0, 3)) {
    const ownedInfo = await solana.getAndInferAndDecodeAccount(
      ownedAccount.accountAddress,
    );
    expect(ownedInfo.programAddress).toStrictEqual(programAddress);
    expect(ownedInfo.accountIdl.name).toStrictEqual("Campaign");
    expect(
      jsonIsDeepSubset({ metadata: { bytes: [] } }, ownedInfo.accountState),
    ).toStrictEqual(true);
  }
});
