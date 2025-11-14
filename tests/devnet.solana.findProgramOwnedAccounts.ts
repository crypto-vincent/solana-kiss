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
    const { accountInfo: ownedAccountInfo } =
      await solana.getAndInferAndDecodeAccount(ownedAccountAddress);
    expect(ownedAccountInfo.idl?.name).toStrictEqual("Campaign");
    expect(ownedAccountInfo.owner).toStrictEqual(programAddress);
    expect(
      jsonIsDeepSubset({ metadata: { bytes: [] } }, ownedAccountInfo.state),
    ).toStrictEqual(true);
  }
});
