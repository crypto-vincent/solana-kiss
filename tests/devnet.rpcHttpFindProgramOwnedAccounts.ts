import { expect, it } from "@jest/globals";
import {
  pubkeyFromBase58,
  rpcHttpFindProgramOwnedAccounts,
  rpcHttpFromUrl,
  rpcHttpGetAccountWithData,
  urlRpcPublicDevnet,
} from "../src";

const expectedDiscriminatorBytes = new Uint8Array([
  32, 142, 108, 79, 247, 179, 54, 6,
]);

it("run", async () => {
  const rpcHttp = rpcHttpFromUrl(urlRpcPublicDevnet);
  const ownedAccountsBySize = await rpcHttpFindProgramOwnedAccounts(
    rpcHttp,
    pubkeyFromBase58("vVeH6Xd43HAScbxjVtvfwDGqBMaMvNDLsAxwM5WK1pG"),
    { dataSpace: 32 },
  );
  const ownedAccountsByBlob = await rpcHttpFindProgramOwnedAccounts(
    rpcHttp,
    pubkeyFromBase58("vVeH6Xd43HAScbxjVtvfwDGqBMaMvNDLsAxwM5WK1pG"),
    {
      dataBlobs: [
        { offset: 0, bytes: expectedDiscriminatorBytes.slice(0, 6) },
        { offset: 2, bytes: expectedDiscriminatorBytes.slice(2, 8) },
      ],
    },
  );
  expect(ownedAccountsBySize.accountsAddresses).toStrictEqual(
    ownedAccountsByBlob.accountsAddresses,
  );
  const ownedAccountsAddresses = [...ownedAccountsBySize.accountsAddresses];
  for (const ownedAccountAddress of ownedAccountsAddresses.slice(0, 3)) {
    const { accountInfo: ownedAccountInfo } = await rpcHttpGetAccountWithData(
      rpcHttp,
      ownedAccountAddress,
    );
    expect(ownedAccountInfo.data.length).toStrictEqual(32);
    expect(ownedAccountInfo.data.slice(0, 8)).toStrictEqual(
      expectedDiscriminatorBytes,
    );
    expect(ownedAccountInfo.owner).toStrictEqual(
      "vVeH6Xd43HAScbxjVtvfwDGqBMaMvNDLsAxwM5WK1pG",
    );
  }
});
