import { expect, it } from "@jest/globals";
import {
  pubkeyFromBase58,
  rpcHttpFromUrl,
  rpcHttpGetAccountWithData,
} from "../src";
import { idlStoreAnchorFind, idlStoreAnchorParse } from "../src/idl/IdlStore";

it("run", async () => {
  const rpcHttp = rpcHttpFromUrl("https://api.devnet.solana.com");
  const storeAnchorAddress = idlStoreAnchorFind(
    pubkeyFromBase58("UCNcQRtrbGmvuLKA3Jv719Cc6DS4r661ZRpyZduxu2j"),
  );
  const storeAnchorContent = await rpcHttpGetAccountWithData(
    rpcHttp,
    storeAnchorAddress,
  );
  const storeAnchorIdl = idlStoreAnchorParse(storeAnchorContent.data);
  expect(storeAnchorIdl.metadata.name).toStrictEqual("psyche_crowd_funding");
  expect(storeAnchorIdl.typedefs.size).toBe(9);
  expect(storeAnchorIdl.accounts.size).toBe(2);
  expect(storeAnchorIdl.instructions.size).toBe(6);
  expect(storeAnchorIdl.errors.size).toBe(5);
  expect(storeAnchorIdl.events.size).toBe(0);
});
