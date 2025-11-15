import { it } from "@jest/globals";
import {
  jsonIsDeepSubset,
  pubkeyFromBase58,
  rpcHttpFromUrl,
  Solana,
  urlRpcPublicDevnet,
} from "../src";

it("run", async () => {
  const solana = new Solana(rpcHttpFromUrl(urlRpcPublicDevnet));
  const programAddress = pubkeyFromBase58(
    "UCNcQRtrbGmvuLKA3Jv719Cc6DS4r661ZRpyZduxu2j",
  );
  const { accountsAddresses } = await solana.findProgramOwnedAccounts(
    programAddress,
    "Campaign",
  );
  const ownedAccountsAddresses = [...accountsAddresses];
  for (const ownedAccountAddress of ownedAccountsAddresses.slice(0, 3)) {
    const {
      accountIdl: ownedAccountIdl,
      accountInfo: ownedAccountInfo,
      accountState: ownedAccountState,
    } = await solana.getAndInferAndDecodeAccount(ownedAccountAddress);
    expect(ownedAccountIdl.name).toStrictEqual("Campaign");
    expect(ownedAccountInfo.owner).toStrictEqual(programAddress);
    expect(
      jsonIsDeepSubset({ metadata: { bytes: [] } }, ownedAccountState),
    ).toStrictEqual(true);
  }
});
