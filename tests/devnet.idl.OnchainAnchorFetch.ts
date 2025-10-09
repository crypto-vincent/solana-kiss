import { expect, it } from "@jest/globals";
import {
  idlOnchainAnchorAddress,
  idlOnchainAnchorDecode,
  pubkeyFromBase58,
  rpcHttpFromUrl,
  rpcHttpGetAccountWithData,
} from "../src";

it("run", async () => {
  const rpcHttp = rpcHttpFromUrl("https://api.devnet.solana.com");
  const onchainAnchorAddress = idlOnchainAnchorAddress(
    pubkeyFromBase58("UCNcQRtrbGmvuLKA3Jv719Cc6DS4r661ZRpyZduxu2j"),
  );
  const { accountInfo: onchainAnchorInfo } = await rpcHttpGetAccountWithData(
    rpcHttp,
    onchainAnchorAddress,
  );
  const onchainAnchorIdl = idlOnchainAnchorDecode(onchainAnchorInfo.data);
  expect(onchainAnchorIdl.metadata.name).toStrictEqual("psyche_crowd_funding");
  expect(onchainAnchorIdl.typedefs.size).toBe(9);
  expect(onchainAnchorIdl.accounts.size).toBe(2);
  expect(onchainAnchorIdl.instructions.size).toBe(6);
  expect(onchainAnchorIdl.errors.size).toBe(5);
  expect(onchainAnchorIdl.events.size).toBe(0);
});
