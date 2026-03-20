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
  const programAddress = pubkeyFromBase58(
    "vVeH6Xd43HAScbxjVtvfwDGqBMaMvNDLsAxwM5WK1pG",
  );
  const rpcHttp = rpcHttpFromUrl(urlRpcPublicDevnet);
  const ownedAccountsBySize = await rpcHttpFindProgramOwnedAccounts(
    rpcHttp,
    programAddress,
    { dataSpace: 32 },
  );
  const ownedAccountsByBlob = await rpcHttpFindProgramOwnedAccounts(
    rpcHttp,
    programAddress,
    {
      dataBlobs: [
        { offset: 0, bytes: expectedDiscriminatorBytes.slice(0, 6) },
        { offset: 2, bytes: expectedDiscriminatorBytes.slice(2, 8) },
      ],
    },
  );
  expect(ownedAccountsBySize).toStrictEqual(ownedAccountsByBlob);
  const ownedAccountsAddresses = ownedAccountsBySize.map(
    (item) => item.accountAddress,
  );
  for (const ownedAccountAddress of ownedAccountsAddresses.slice(0, 3)) {
    const ownedAccount = await rpcHttpGetAccountWithData(
      rpcHttp,
      ownedAccountAddress,
    );
    expect(ownedAccount.programAddress).toStrictEqual(programAddress);
    expect(ownedAccount.accountData.length).toStrictEqual(32);
    expect(ownedAccount.accountData.slice(0, 8)).toStrictEqual(
      expectedDiscriminatorBytes,
    );
  }
});
