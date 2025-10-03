import { it } from "@jest/globals";
import { rpcHttpFromUrl, rpcHttpGetAccountMetadata } from "../src";
import { rpcHttpFindProgramOwnedAddresses } from "../src/rpc/RpcHttpFindProgramOwnedAddresses";

it("run", async () => {
  const rpcHttp = rpcHttpFromUrl("https://api.devnet.solana.com");
  const ownedAddresses = await rpcHttpFindProgramOwnedAddresses(
    rpcHttp,
    "vVeH6Xd43HAScbxjVtvfwDGqBMaMvNDLsAxwM5WK1pG",
  );
  expect(ownedAddresses.size).toBeGreaterThan(0);
  const ownedAddress = Array.from(ownedAddresses)[0]!;
  const ownedMetadata = await rpcHttpGetAccountMetadata(rpcHttp, ownedAddress);
  expect(ownedMetadata.space).toBeGreaterThan(0);
  expect(ownedMetadata.owner).toBe(
    "vVeH6Xd43HAScbxjVtvfwDGqBMaMvNDLsAxwM5WK1pG",
  );
});
