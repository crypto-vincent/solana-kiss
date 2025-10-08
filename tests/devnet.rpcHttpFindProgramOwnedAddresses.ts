import { expect, it } from "@jest/globals";
import {
  pubkeyFromBase58,
  rpcHttpFindProgramOwnedAddresses,
  rpcHttpFromUrl,
  rpcHttpGetAccountWithData,
} from "../src";

const expectedDiscriminatorBytes = new Uint8Array([
  32, 142, 108, 79, 247, 179, 54, 6,
]);

it("run", async () => {
  const rpcHttp = rpcHttpFromUrl("https://api.devnet.solana.com");
  const ownedAddressesBySize = await rpcHttpFindProgramOwnedAddresses(
    rpcHttp,
    pubkeyFromBase58("vVeH6Xd43HAScbxjVtvfwDGqBMaMvNDLsAxwM5WK1pG"),
    { dataSize: 32 },
  );
  const ownedAddressesByBlob = await rpcHttpFindProgramOwnedAddresses(
    rpcHttp,
    pubkeyFromBase58("vVeH6Xd43HAScbxjVtvfwDGqBMaMvNDLsAxwM5WK1pG"),
    {
      dataBlobs: [
        { offset: 0, bytes: expectedDiscriminatorBytes.slice(0, 6) },
        { offset: 2, bytes: expectedDiscriminatorBytes.slice(2, 8) },
      ],
    },
  );
  expect(ownedAddressesBySize).toStrictEqual(ownedAddressesByBlob);
  for (const ownedAddress of [...ownedAddressesBySize].slice(0, 3)) {
    const metadata = await rpcHttpGetAccountWithData(rpcHttp, ownedAddress);
    expect(metadata.data.slice(0, 8)).toStrictEqual(expectedDiscriminatorBytes);
    expect(metadata.owner).toStrictEqual(
      "vVeH6Xd43HAScbxjVtvfwDGqBMaMvNDLsAxwM5WK1pG",
    );
  }
});
