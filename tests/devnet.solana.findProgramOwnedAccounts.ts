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

  for (const accountAddress of accountsAddresses) {
    const { accountInfo } =
      await solana.getAndInferAndDecodeAccountInfo(accountAddress);
    expect(accountInfo.idl?.name).toStrictEqual("Campaign");
    expect(accountInfo.owner).toStrictEqual(programAddress);
    expect(
      jsonIsDeepSubset(
        {
          bump: undefined,
          index: undefined,
          metadata: {
            length: undefined,
            bytes: [],
          },
        },
        accountInfo.state,
      ),
    ).toStrictEqual(true);
    return;
  }
});
